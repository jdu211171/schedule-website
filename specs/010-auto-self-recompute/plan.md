# Plan — Auto Self Status Recompute

1. Import self‑recompute helper in class session PATCH
2. Invoke after successful update (when key fields changed)
3. Extend series PATCH to recompute each updated instance
4. Keep errors non‑blocking and minimal changes

