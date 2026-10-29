"""The same table interface in memory: used by the tests, and locally when Supabase isn't configured (lost on restart)."""
from __future__ import annotations

import copy
from collections import defaultdict
from typing import Any

from .base import Row


def _matches(row: Row, where: Row | None) -> bool:
    return all(row.get(k) == v for k, v in (where or {}).items())


class MemoryTable:
    def __init__(self, rows: list[Row]) -> None:
        self.rows = rows

    async def insert(self, rows: list[Row], *, upsert_on: tuple[str, ...] = ()) -> None:
        for row in rows:
            existing = next((r for r in self.rows if upsert_on and all(r.get(k) == row.get(k) for k in upsert_on)), None)
            if existing is not None:
                existing.update(copy.deepcopy(row))
            else:
                self.rows.append(copy.deepcopy(row))

    async def select(
        self, *, where: Row | None = None, columns: str = "*", order: str | None = None, desc: bool = True, limit: int | None = None
    ) -> list[Row]:
        found = [copy.deepcopy(r) for r in self.rows if _matches(r, where)]
        if order:
            present = [r for r in found if r.get(order) is not None]
            missing = [r for r in found if r.get(order) is None]
            found = sorted(present, key=lambda r: r[order], reverse=desc) + missing
        if columns != "*":
            keep = [c.strip() for c in columns.split(",")]
            found = [{k: r.get(k) for k in keep} for r in found]
        return found[:limit] if limit else found

    async def update(self, where: Row, values: Row) -> None:
        for row in self.rows:
            if _matches(row, where):
                row.update(copy.deepcopy(values))

    async def delete(self, where: Row) -> None:
        self.rows[:] = [r for r in self.rows if not _matches(r, where)]


class MemoryDatabase:
    kind = "memory"

    def __init__(self) -> None:
        self._tables: defaultdict[str, list[Row]] = defaultdict(list)

    def table(self, name: str) -> MemoryTable:
        return MemoryTable(self._tables[name])

    async def ping(self) -> bool:
        return True

    async def close(self) -> None:
        return None

    def dump(self, name: str) -> list[dict[str, Any]]:
        return self._tables[name]
