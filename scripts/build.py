"""Build the offline, single-file edition using only Python's standard library."""
from pathlib import Path
import base64, json, shutil, zipfile
root=Path(__file__).resolve().parents[1]
out=root.parent/'outputs'
out.mkdir(exist_ok=True)
html=(root/'index.html').read_text(encoding='utf-8')
html=html.replace('<link rel="stylesheet" href="css/style.css?v=4">','<style>'+(root/'css/style.css').read_text(encoding='utf-8')+'</style>')
for name in ['data','model','charts','app']:
 code=(root/'js'/(name+'.js')).read_text(encoding='utf-8')
 if name=='data':
  photos={p.stem:'data:image/jpeg;base64,'+base64.b64encode(p.read_bytes()).decode() for p in (root/'assets').glob('*.jpg')}
  code=code.replace('const commons=','const embeddedPhotos='+json.dumps(photos)+';\nconst commons=')
  code=code.replace("src:'assets/'+key+'.jpg'","src:embeddedPhotos[key]")
 html=html.replace('<script defer src="js/'+name+'.js?v=4"></script>','<script>'+code+'</script>')
(out/'くるまのCO2e実験室_単独版.html').write_text(html,encoding='utf-8')
dest=out/'くるまのCO2e実験室_v4'
dest.mkdir(exist_ok=True)
for folder in ['assets','css','js','docs','tests']:shutil.copytree(root/folder,dest/folder,dirs_exist_ok=True)
for name in ['index.html','README.md','LICENSE','LICENSE-NOTES.md','package.json']:shutil.copy2(root/name,dest/name)
with zipfile.ZipFile(out/'くるまのCO2e実験室_v4.zip','w',zipfile.ZIP_DEFLATED) as z:
 for p in sorted(dest.rglob('*')):
  if p.is_file():z.write(p,p.relative_to(out))
with zipfile.ZipFile(out/'くるまのCO2e実験室_v4.zip','r') as z:
 assert z.testzip() is None
print('Built offline HTML and v4 ZIP')
