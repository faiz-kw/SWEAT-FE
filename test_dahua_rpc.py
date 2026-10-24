import urllib.request
import json

URL = "http://192.168.1.108/RPC2"
USER = "admin"
PASS = "tipl9910"

mgr = urllib.request.HTTPPasswordMgrWithDefaultRealm()
mgr.add_password(None, URL, USER, PASS)
handler = urllib.request.HTTPDigestAuthHandler(mgr)
opener = urllib.request.build_opener(handler)

# 1. Test getting caps or users
payload = {
    "method": "accessControlManager.getCaps",
    "params": {},
    "id": 1
}

req = urllib.request.Request(
    URL,
    data=json.dumps(payload).encode('utf-8'),
    headers={"Content-Type": "application/json"}
)

try:
    resp = opener.open(req, timeout=5)
    print("RPC2 Response:", resp.read().decode('utf-8'))
except Exception as e:
    print("RPC2 Error:", e)
