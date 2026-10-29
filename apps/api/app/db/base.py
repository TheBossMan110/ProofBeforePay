"""A deliberately small table interface, so repositories run unchanged on Supabase and in memory (tests, local dev)."""
from __future__ import annotations

from typing import Any, Protocol

Row = dict[str, Any]


class DatabaseError(RuntimeError):
    """A database call failed. Repositories decide whether that's fatal."""


class Table(Protocol):
    async def insert(self, rows: list[Row], *, upsert_on: tuple[str, ...] = ()) -> None: ...

    async def select(
        self, *, where: Row | None = None, columns: str = "*", order: str | None = None, desc: bool = True, limit: int | None = None
    ) -> list[Row]: ...

    async def update(self, where: Row, values: Row) -> None: ...

    async def delete(self, where: Row) -> None: ...


class Database(Protocol):
    kind: str

    def table(self, name: str) -> Table: ...

    async def ping(self) -> bool: ...

    async def close(self) -> None: ...
