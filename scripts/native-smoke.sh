#!/bin/bash
# Container-only smoke test. Run with --network none; never changes packaged permissions.
set -euo pipefail
Xvfb :99 -screen 0 1440x1000x24 >/tmp/native-evidence/xvfb.log 2>&1 &
xvfb_pid=$!
trap 'kill "$xvfb_pid" 2>/dev/null || true' EXIT
export DISPLAY=:99
export WEBKIT_DISABLE_DMABUF_RENDERER=1
/app/spanish321 >/tmp/native-evidence/app.log 2>&1 &
app_pid=$!
for i in {1..30}; do
  if xdotool search --name Spanish321 >/tmp/native-evidence/windows.txt 2>/dev/null; then break; fi
  if ! kill -0 "$app_pid" 2>/dev/null; then cat /tmp/native-evidence/app.log; exit 1; fi
  sleep 1
done
sleep 4
python3 - <<'PY'
import gi
gi.require_version('Gdk','3.0')
from gi.repository import Gdk
root=Gdk.get_default_root_window()
Gdk.pixbuf_get_from_window(root,0,0,1440,1000).savev('/tmp/native-evidence/native-dashboard.png','png',[],[])
PY
kill -0 "$app_pid"
kill "$app_pid"
wait "$app_pid" || true
find /home/learner/.local/share -name 'learner.sqlite3' -print >/tmp/native-evidence/database-path.txt
python3 - <<'PY'
import pathlib,sqlite3,json
paths=list(pathlib.Path('/home/learner/.local/share').rglob('learner.sqlite3'))
assert paths,'Application-data SQLite database was not created'
c=sqlite3.connect(paths[0]);assert c.execute('PRAGMA user_version').fetchone()[0]==1
state=c.execute('SELECT json FROM learner_state WHERE id=1').fetchone()
assert state,'UI did not persist its initial state through native IPC'
assert json.loads(state[0])['version']==1
print('Native launch, packaged UI startup, SQLite migration, and initial IPC persistence passed.')
PY
