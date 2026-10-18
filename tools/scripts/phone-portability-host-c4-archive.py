"""Bounded byte-only archive validation and Windows durability; no decoder/model imports."""
import pathlib,hashlib,json,zipfile,os,contextlib,re,stat
MAX_ARCHIVE=128*1024*1024;CHUNK=65536
class ArchiveFailure(Exception):
 def __init__(self,stage,error):
  code=str(error)
  if not re.fullmatch(r'PORTABILITY_[A-Z0-9_]{1,112}',code):code='PORTABILITY_ARCHIVE_FAILED_PRIVATE_DETAILS_WITHHELD'
  self.stage=stage;self.code=code;super().__init__(code)
@contextlib.contextmanager
def phase(name,guard,hook):
 try:
  guard()
  if hook:hook(name)
  yield
 except ArchiveFailure:raise
 except Exception as error:raise ArchiveFailure(name,error) from error
def plain(path):
 p=pathlib.Path(path).absolute()
 if p.resolve()!=p:raise ValueError('PORTABILITY_ARCHIVE_UNSAFE_PATH')
 for component in [p,*p.parents]:
  if component.is_symlink() or (component.exists() and getattr(component.lstat(),'st_file_attributes',0)&0x400):raise ValueError('PORTABILITY_ARCHIVE_UNSAFE_PATH')
 return p
def hashfile(path,guard=lambda:None):
 p=plain(path);digest=hashlib.sha256();count=0
 with p.open('rb') as f:
  while True:
   guard();raw=f.read(CHUNK)
   if not raw:break
   count+=len(raw)
   if count>MAX_ARCHIVE:raise ValueError('PORTABILITY_ARCHIVE_BOUND')
   digest.update(raw)
 return digest.hexdigest(),count
def expected_entries(contract,manifest):
 expected={'manifest.json':(len(manifest),hashlib.sha256(manifest).hexdigest())}
 def add(name,size,digest,limit):
  if not isinstance(name,str) or '\\' in name or '\x00' in name or ':' in name or name.startswith('/') or any(p in ['','..','.'] for p in name.split('/')) or name in expected:raise ValueError('PORTABILITY_ARCHIVE_MEMBERSHIP')
  if type(size)is not int or size<1 or size>limit or not isinstance(digest,str) or not re.fullmatch('[0-9a-f]{64}',digest):raise ValueError('PORTABILITY_ARCHIVE_EXPECTED_BOUNDS')
  expected[name]=(size,digest)
 if len(contract['records'])!=40 or len(contract['metadata'])!=3 or len(manifest)>2*1024*1024:raise ValueError('PORTABILITY_ARCHIVE_EXPECTED_COUNT')
 for r in contract['metadata']:add(r['path'],r['bytes'],r['sha256'],2*1024*1024)
 for r in contract['records']:
  add(r['jpegPath'],r['jpegBytes'],r['jpegSha256'],6*1024*1024)
  if r['tensorBytes']!=602112:raise ValueError('PORTABILITY_ARCHIVE_CONTROL_BOUND')
  add(r['tensorPath'],r['tensorBytes'],r['tensorSha256'],602112)
 if len(expected)!=84 or sum(x[0] for x in expected.values())>MAX_ARCHIVE:raise ValueError('PORTABILITY_ARCHIVE_EXPECTED_COUNT')
 return expected
def validate(path,contract,manifest,payloads,guard=lambda:None):
 path=plain(path)
 if path.stat().st_size>MAX_ARCHIVE:raise ValueError('PORTABILITY_ARCHIVE_BOUND')
 expected=expected_entries(contract,manifest);checked=0
 with zipfile.ZipFile(path,'r') as archive:
  rows=archive.infolist()
  if len(rows)!=84 or len({r.filename for r in rows})!=84 or {r.filename for r in rows}!=set(expected):raise ValueError('PORTABILITY_ARCHIVE_MEMBERSHIP')
  for row in rows:
   guard();size,digest=expected[row.filename]
   if row.is_dir() or row.orig_filename!=row.filename or stat.S_ISLNK(row.external_attr>>16) or row.compress_type!=zipfile.ZIP_STORED or row.flag_bits&1 or row.file_size!=size or row.compress_size!=size:raise ValueError('PORTABILITY_ARCHIVE_ENTRY_POLICY')
   if not payloads and row.filename!='manifest.json':continue
   h=hashlib.sha256();count=0
   with archive.open(row,'r') as entry:
    while True:
     guard();raw=entry.read(CHUNK)
     if not raw:break
     count+=len(raw)
     if count>size:raise ValueError('PORTABILITY_ARCHIVE_PAYLOAD_SIZE')
     h.update(raw)
   if count!=size or h.hexdigest()!=digest:raise ValueError('PORTABILITY_ARCHIVE_PAYLOAD_HASH')
   checked+=1
 return dict(entries=84,payloadsChecked=checked,allPayloadsChecked=payloads and checked==84)
def durable_json(path,value,guard=lambda:None):
 path=plain(path);raw=(json.dumps(value,separators=(',',':'),ensure_ascii=False)+'\n').encode()
 with path.open('xb') as f:f.write(raw);f.flush();os.fsync(f.fileno())
 guard()
 if path.read_bytes()!=raw:raise ValueError('PORTABILITY_ARCHIVE_RECEIPT_READBACK')
 return hashlib.sha256(raw).hexdigest()
def recover(donor,output,contract,manifest,donor_hash,donor_bytes,receipt,guard=lambda:None,hook=None):
 donor=plain(donor);output=plain(output)
 if not output.is_dir():raise ValueError('PORTABILITY_ARCHIVE_OWNED_OUTPUT_REQUIRED')
 pending=output/'packet.pending.zip';target=output/'private-portability-input.zip';record=output/'packet-receipt.json'
 if any(p.exists() for p in [pending,target,record]):raise ValueError('PORTABILITY_ARCHIVE_NO_OVERWRITE')
 with phase('DONOR_IDENTITY',guard,hook):
  if hashfile(donor,guard)!=(donor_hash,donor_bytes):raise ValueError('PORTABILITY_ARCHIVE_DONOR_BINDING')
 with phase('PAYLOAD_VALIDATION',guard,hook):validation=validate(donor,contract,manifest,True,guard)
 with phase('COPY',guard,hook):
  count=0
  with donor.open('rb') as source,pending.open('xb') as destination:
   while True:
    guard();raw=source.read(CHUNK)
    if not raw:break
    count+=len(raw)
    if count>donor_bytes:raise ValueError('PORTABILITY_ARCHIVE_DONOR_CHANGED')
    destination.write(raw)
   if count!=donor_bytes:raise ValueError('PORTABILITY_ARCHIVE_DONOR_CHANGED')
   with phase('FLUSH',guard,hook):destination.flush();os.fsync(destination.fileno())
 with phase('READBACK',guard,hook):
  if hashfile(pending,guard)!=(donor_hash,donor_bytes) or hashfile(donor,guard)!=(donor_hash,donor_bytes):raise ValueError('PORTABILITY_ARCHIVE_DONOR_CHANGED')
  validate(pending,contract,manifest,True,guard)
 with phase('PROMOTION',guard,hook):
  if os.name!='nt' or pending.parent!=target.parent or pending.stat().st_dev!=output.stat().st_dev:raise ValueError('PORTABILITY_ARCHIVE_WINDOWS_SAME_FILESYSTEM_REQUIRED')
  if target.exists():raise ValueError('PORTABILITY_ARCHIVE_NO_OVERWRITE')
  os.rename(pending,target) # Windows: same-filesystem rename refuses an existing destination.
  if hashfile(target,guard)!=(donor_hash,donor_bytes):raise ValueError('PORTABILITY_ARCHIVE_PROMOTION_READBACK')
 with phase('RECEIPT',guard,hook):
  receipt=dict(receipt,kind='RECOVERED_FROM_C3_FINALIZATION_FAILURE',recoveryStage='ARCHIVE_DURABLE_NEW_JOB_CLOSURE_REQUIRED',packetSha256=donor_hash,packetBytes=donor_bytes,manifestSha256=hashlib.sha256(manifest).hexdigest(),entriesVerified=84,payloadHashesVerified=84,recordCount=40,queryDenominator=20,newControlTensors=0,privateModelInferences=0,newClosureRequired=True,newClosureFile='recovery-closure.json')
  receipt_hash=durable_json(record,receipt,guard)
 with phase('FINAL_IDENTITY',guard,hook):
  if hashfile(donor,guard)!=(donor_hash,donor_bytes) or hashfile(target,guard)!=(donor_hash,donor_bytes):raise ValueError('PORTABILITY_ARCHIVE_DONOR_CHANGED')
 return dict(validation=validation,packetSha256=donor_hash,packetBytes=donor_bytes,receiptSha256=receipt_hash,closurePending=True)
