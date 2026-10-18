import { readFileSync, writeFileSync, realpathSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { evaluatePortability } from './phonePortabilityEvaluation.ts';
import { parsePortabilityJson } from './phonePortabilitySchema.ts';
export function phonePortabilityCli(args: string[]) {
  try {
    if (args.length !== 4 || args[0] !== '--input' || args[2] !== '--output') throw Error('PORTABILITY_ARGUMENTS');
    const input=realpathSync(args[1]),output=resolve(args[3]);if(input===output)throw Error('PORTABILITY_OUTPUT_INPUT');
    const stat=statSync(input);if(!stat.isFile()||stat.size>8*1024*1024)throw Error('PORTABILITY_INPUT_BOUND');
    const raw=readFileSync(input);if(raw.length>8*1024*1024)throw Error('PORTABILITY_INPUT_BOUND');
    const report=evaluatePortability(parsePortabilityJson(raw));writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
    console.log(JSON.stringify({complete:report.complete,runtimeParityPassed:report.runtimeParityPassed,denominator:20,formalAdmission:false}));return report.complete?0:2;
  } catch(error){console.error(error instanceof Error&&/^PORTABILITY_[A-Z_]+$/.test(error.message)?error.message:'PORTABILITY_INPUT_INVALID');return 1;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)process.exitCode=phonePortabilityCli(process.argv.slice(2));
