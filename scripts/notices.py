"""Prepare an inspectable dependency-license inventory; never invent missing licenses."""
import json,os,pathlib,tomllib
root=pathlib.Path(__file__).resolve().parents[1]
out=[]
lock=json.loads((root/'package-lock.json').read_text())
for loc,p in lock['packages'].items():
 if not loc:continue
 name=loc.split('node_modules/')[-1]
 meta=root/loc/'package.json'
 installed=json.loads(meta.read_text()) if meta.exists() else {}
 out.append(dict(ecosystem='npm',name=name,version=p['version'],license=p.get('license',installed.get('license','NOT RECORDED')),development=bool(p.get('dev',False))))
registry=pathlib.Path(os.environ.get('CARGO_HOME',str(pathlib.Path.home()/'.cargo')))/'registry/src'
for p in tomllib.loads((root/'Cargo.lock').read_text())['package']:
 if 'source' not in p:continue
 files=list(registry.glob('*/'+p['name']+'-'+p['version']+'/Cargo.toml'))
 meta=tomllib.loads(files[0].read_text())['package'] if files else {}
 out.append(dict(ecosystem='cargo',name=p['name'],version=p['version'],license=meta.get('license', 'SEE LICENSE FILE' if meta.get('license-file') else 'NOT RECORDED'),repository=meta.get('repository','')))
(root/'release').mkdir(exist_ok=True)
(root/'release/THIRD-PARTY-NOTICES.json').write_text(json.dumps({'purpose':'Dependency metadata inventory, not a substitute for required copyright/license texts. Includes development and target-specific dependencies. Review missing records before public binary redistribution.','dependencies':out},indent=2)+'\n')
print(f'License inventory: {len(out)} dependencies; {sum(x["license"]=="NOT RECORDED" for x in out)} missing records explicitly flagged.')
