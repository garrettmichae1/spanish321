"""Refresh retrieval evidence only. Does not claim playback, transcript access, or copy permission."""
import concurrent.futures, datetime, json, pathlib, re, urllib.request
root = pathlib.Path(__file__).resolve().parents[1]
resources = json.loads((root / 'content/resources.json').read_text())
def check(resource):
    url = resource['url']
    record = {'id': resource['id'], 'url': url, 'checkedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'method': 'HTTP GET; HTML title inspected. Playback and captions not verified.'}
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 Spanish321 resource checker'}), timeout=25) as response:
            html = response.read().decode('utf-8', errors='replace')
            titles = re.findall(r'<title[^>]*>(.*?)</title>', html, re.S)
            record.update(status=response.status, finalUrl=response.url, title=titles[0].strip() if titles else '')
    except Exception as error:
        record.update(status='uncertain', error=str(error))
    return record
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    checks = list(pool.map(check, resources))
(root / 'research/resource-checks-latest.json').write_text(json.dumps(checks, ensure_ascii=False, indent=2))
for record in checks:
    print(record['status'], record['id'], record.get('title', record.get('error')))
# The catalog is reviewed separately; this script never silently declares a resource free.
