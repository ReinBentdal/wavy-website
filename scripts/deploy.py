#!/usr/bin/env python3
"""
Incremental FTP-TLS deploy based on SHA-256 hashes.
1. Generates local hashes.json
2. Downloads remote hashes.json (if any)
3. Uploads only changed / new files; deletes orphaned ones
4. Finally uploads the fresh hashes.json

The following ENVs are used:
FTP_SERVER      - FTP server hostname
FTP_PORT        - FTP server port 
FTP_NAME        - FTP username
FTP_PW          - FTP password
DEPLOY_LOCAL_DIR  - Local directory to deploy from
DEPLOY_REMOTE_DIR - Remote directory to deploy to
(opt)DEPLOY_HASH_FILE  - Hash file name (defaults to _hashes.json)
"""

import hashlib, json, os, io, pathlib
from ftplib import FTP_TLS, error_perm
from dotenv import load_dotenv

# ---------- configuration ----------
load_dotenv()
LOCAL_DIR   = pathlib.Path(os.getenv('DEPLOY_LOCAL_DIR'))
REMOTE_DIR  = os.getenv('DEPLOY_REMOTE_DIR')
HASH_FILE   = os.getenv('DEPLOY_HASH_FILE', '_hashes.json')
FTP_SERVER   = os.getenv('FTP_SERVER')
FTP_PORT     = int(os.getenv('FTP_PORT', '21'))
FTP_NAME     = os.getenv('FTP_NAME') 
FTP_PW       = os.getenv('FTP_PW')

if not all([FTP_SERVER, FTP_NAME, FTP_PW, LOCAL_DIR, REMOTE_DIR, HASH_FILE]):
    raise ValueError("FTP_SERVER, FTP_NAME and FTP_PW must be set in .env")

if not LOCAL_DIR or not REMOTE_DIR:
    raise ValueError("DEPLOY_LOCAL_DIR and DEPLOY_REMOTE_DIR must be set in .env")

# ---------- helpers ----------
def sha256sum(path: pathlib.Path) -> str:
    CHUNK = 128 * 1024
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(CHUNK), b""):
            h.update(block)
    return h.hexdigest()[:8]

def prune_empty_parents(ftp: FTP_TLS, rel_path: str):
    """
    Try to remove each parent directory of rel_path (relative to REMOTE_DIR)
    until we hit one that still contains items or we reach REMOTE_DIR itself.
    """
    parts = rel_path.split("/")[:-1]           # skip the file name
    while parts:
        dir_path = "/".join(parts)
        try:
            ftp.rmd(dir_path)                  # succeeds only if empty
            print("  RMD empty dir", dir_path)
        except error_perm as e:
            if str(e).startswith("550"):
                break                          # not empty → stop climbing
            else:
                print(f"  ⚠️  could not rmd {dir_path}: {e}")
                break
        parts.pop()        

def build_hash_map(base: pathlib.Path) -> dict[str, str]:
    out = {}
    excluded_files = [".DS_Store"]
    for p in base.rglob("*"):
        if p.is_file() and p.name not in excluded_files:
            out[str(p.relative_to(base)).replace(os.sep, "/")] = sha256sum(p)
    return out

def ensure_remote_dirs(ftp: FTP_TLS, remote_path: str):
    dirs = remote_path.split("/")[:-1]
    path = ""
    for d in dirs:
        path = f"{path}/{d}" if path else d
        try:
            ftp.mkd(path)
        except error_perm:
            pass  # already exists

def download_remote_hashes(ftp: FTP_TLS) -> dict[str, str]:
    buf = io.BytesIO()
    try:
        ftp.retrbinary(f"RETR {HASH_FILE}", buf.write)
        buf.seek(0)
        return json.load(buf)
    except error_perm:
        return {} # first deploy – no file yet

def upload_hash_json(ftp: FTP_TLS, hashes: dict):
    print("\n  UPLOAD hash")
    data = json.dumps(hashes, indent=2).encode()
    ftp.storbinary(f"STOR {HASH_FILE}", io.BytesIO(data))

def delete_remote_path(ftp: FTP_TLS, path: str):
    try:
        ftp.delete(path)
        print("  DEL file ", path)
        prune_empty_parents(ftp, path)
    except error_perm:
        # directory -> recurse then rmd
        try:
            ftp.cwd(path)
            for item in ftp.nlst():
                if item in (".", ".."):
                    continue
                delete_remote_path(ftp, f"{path}/{item}")
            ftp.cwd("..")
            ftp.rmd(path)
            print("  DEL dir  ", path)
        except Exception as e:
            print(f"Error while deleting {path}: {e}")

def upload_file(ftp: FTP_TLS, local_base: pathlib.Path, rel_path: str):
    local_file = local_base / rel_path
    remote_path = rel_path
    ensure_remote_dirs(ftp, remote_path)
    with local_file.open("rb") as f:
        ftp.storbinary(f"STOR {remote_path}", f)
    print("  PUT      ", rel_path)

# ---------- main ----------
def main():
    local_hashes  = build_hash_map(LOCAL_DIR)
    print(f"Local files: {len(local_hashes)} hashed")

    ftp = FTP_TLS()
    ftp.connect(FTP_SERVER, FTP_PORT)
    ftp.login(FTP_NAME, FTP_PW)
    ftp.prot_p()
    ftp.cwd(REMOTE_DIR)

    remote_hashes = download_remote_hashes(ftp)
    print(f"Remote baseline: {len(remote_hashes)} entries")

    # diff sets
    to_upload = [p for p, h in local_hashes.items() if remote_hashes.get(p) != h]
    to_delete = [p for p in remote_hashes.keys() if p not in local_hashes]

    
    print("\nFiles to process:")
    for path in to_upload:
        if path in remote_hashes:
            print(f"  🔄 {path}  (modified)")
        else:
            print(f"  ✨ {path}  (new)")
            
    for path in to_delete:
        print(f"  🗑️  {path}  (delete)")

    print(f"Changed/new: {len(to_upload)} → upload")
    print(f"Obsolete   : {len(to_delete)} → delete")
    if not to_upload and not to_delete:
        print("\nNo changes detected. Nothing to deploy.")
        ftp.quit()
        return

    input("Press ENTER to continue:")
    
    print("Starting deployment:")

    # delete
    for rel in to_delete:
        delete_remote_path(ftp, rel)

    # upload
    for rel in to_upload:
        upload_file(ftp, LOCAL_DIR, rel)

    # update hashes.json
    upload_hash_json(ftp, local_hashes)
    ftp.quit()
    print("✅  Deploy complete")

if __name__ == "__main__":
    main()