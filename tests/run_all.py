"""Runs every Dungeons and Dragons test against a Monolith checkout (MONOLITH_DIR, default ../monolith)."""
import subprocess, sys, os, time
HERE=os.path.dirname(os.path.abspath(__file__))
SUITES=["sheet_test.py","creator_test.py"]
failed=[];CI=bool(os.environ.get("GITHUB_ACTIONS"))
for s in SUITES:
    t=time.time();print(f"\n===== {s}",flush=True)
    try: r=subprocess.run([sys.executable,os.path.join(HERE,s)],cwd=HERE,timeout=600,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
    except subprocess.TimeoutExpired: print("TIMED OUT");failed.append(s);CI and print(f"::error title={s}::timed out");continue
    print(r.stdout,end="",flush=True)
    if r.returncode:
        failed.append(s)
        if CI:
            L=r.stdout.splitlines();bad=[l for l in L if l.startswith("FAIL") or "Error" in l][:8] or L[-6:]
            for l in bad:print(f"::error title={s}::{l[:300]}")
    print(f"({time.time()-t:.0f}s)")
print("\nALL PASSED" if not failed else "\nFAILED: "+", ".join(failed))
sys.exit(1 if failed else 0)
