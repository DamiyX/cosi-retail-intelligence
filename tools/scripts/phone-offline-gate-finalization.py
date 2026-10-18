"""Exclusive invocation claim, checked before any finalizer artifact write. No cleanup/retry."""
import datetime, hashlib, json, os, pathlib

class FinalizationRefused(RuntimeError):
 pass

def acquire(run, workflow, holder, state, now=None):
 run,workflow=pathlib.Path(run),pathlib.Path(workflow)
 if not run.is_dir():raise FinalizationRefused('RUN_MISSING')
 if any((run/name).exists() for name in ['stopped.json','frozen-inventory.json','frozen-inventory.sha256.json']):raise FinalizationRefused('FINISHED')
 claim=run/'finalizer-invocation.claim.json'
 if claim.exists():raise FinalizationRefused('ALREADY_CLAIMED')
 raw=workflow.read_bytes();w=json.loads(raw);lease=w.get('lease')
 current=now or datetime.datetime.now(datetime.timezone.utc)
 if w.get('current_state')!=state or not isinstance(lease,dict) or lease.get('holder')!=holder:raise FinalizationRefused('LEASE_OR_STATE')
 try:expiry=datetime.datetime.fromisoformat(lease['expires_at'])
 except (ValueError,KeyError,TypeError):raise FinalizationRefused('LEASE_MALFORMED')
 if expiry.tzinfo is None or current>=expiry:raise FinalizationRefused('LEASE_EXPIRED')
 # Re-read before the first write; O_EXCL is the atomic competing-invocation boundary.
 if workflow.read_bytes()!=raw:raise FinalizationRefused('WORKFLOW_CHANGED')
 if any((run/name).exists() for name in ['stopped.json','frozen-inventory.json','frozen-inventory.sha256.json']):raise FinalizationRefused('FINISHED')
 payload=json.dumps(dict(kind='EXCLUSIVE_FINALIZER_INVOCATION',pid=os.getpid(),claimedAt=current.isoformat(),workflowSha256=hashlib.sha256(raw).hexdigest(),holder=holder,state=state,leaseExpiresAt=lease['expires_at'],singleUse=True),sort_keys=True).encode()+b'\n'
 try:fd=os.open(claim,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
 except FileExistsError:raise FinalizationRefused('ALREADY_CLAIMED')
 with os.fdopen(fd,'wb') as stream:stream.write(payload);stream.flush();os.fsync(stream.fileno())
 # Never remove/rewrite the claim, even if a later check fails or the process dies.
 if workflow.read_bytes()!=raw:raise FinalizationRefused('WORKFLOW_CHANGED_AFTER_CLAIM')
 return raw,claim
