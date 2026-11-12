#!/bin/bash
set -euo pipefail
export DISPLAY=:98 WEBKIT_DISABLE_DMABUF_RENDERER=1
Xvfb :98 -screen 0 1440x1000x24 >/tmp/native-evidence/export-xvfb.log 2>&1 &
xvfb_pid=$!
for i in {1..20}; do xdotool getdisplaygeometry >/dev/null 2>&1 && break; sleep .2; done
/usr/bin/spanish321 >/tmp/native-evidence/export-app.log 2>&1 &
app_pid=$!
trap 'kill "$app_pid" "$xvfb_pid" 2>/dev/null || true' EXIT
sleep 5
xdotool mousemove 110 795 click 1
sleep 2
python3 - <<'PY'
import gi
gi.require_version('Gdk','3.0')
from gi.repository import Gdk
Gdk.pixbuf_get_from_window(Gdk.get_default_root_window(),0,0,1440,1000).savev('/tmp/native-evidence/native-settings.png','png',[],[])
PY
# The backup button follows the text size selector in the settings form.
xdotool key Tab Tab Tab
xdotool key Return
sleep 2
python3 - <<'PY'
import gi
gi.require_version('Gdk','3.0')
from gi.repository import Gdk
Gdk.pixbuf_get_from_window(Gdk.get_default_root_window(),0,0,1440,1000).savev('/tmp/native-evidence/native-export-dialog.png','png',[],[])
PY
xdotool key ctrl+a
xdotool type --clearmodifiers '/home/learner/spanish321-native-backup.json'
xdotool key Return
sleep 3
python3 - <<'PY'
import json,pathlib
p=pathlib.Path('/home/learner/spanish321-native-backup.json')
s=json.loads(p.read_text())
assert s['version']==1
assert any(h['text']=='Native offline homework persists.' for h in s['homework'].values())
print('Native Save dialog exported a valid backup with the persisted homework.')
PY
