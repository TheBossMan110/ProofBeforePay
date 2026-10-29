"""Supabase (Postgres) through its REST API (PostgREST), with the server-only secret key.

HTTPS instead of a direct Postgres connection: Supabase's direct host is IPv6-only, which many networks and hosts
(Render included) can't reach. Row-level security is on with no policies, so only this key can read or write.
"""
from __future__ import annotations

from typing import Any

import httpx

from .base import DatabaseError, Row


def _filters(where: Row | None) -> dict[str, str]:
    params = {}
    for column, value in (where or {}).items():
        if value is None:
            params[column] = "is.null"
        elif isinstance(value, bool):
            params[column] = f"is.{str(value).lower()}"
        else:
            params[column] = f"eq.{value}"
    return params


def _check(response: httpx.Response) -> None:
    if response.status_code >= 400:
        raise DatabaseError(f"{response.status_code} {response.text[:300]}")


class SupabaseTable:
    def __init__(self, client: httpx.AsyncClient, name: str) -> None:
        self.client, self.name = client, name

    async def insert(self, rows: list[Row], *, upsert_on: tuple[str, ...] = ()) -> None:
        if not rows:
            return
        prefer = "return=minimal" + (",resolution=merge-duplicates" if upsert_on else "")
        params = {"on_conflict": ",".join(upsert_on)} if upsert_on else None
        try:
            _check(await self.client.post(f"/{self.name}", json=rows, params=params, headers={"Prefer": prefer}))
        except httpx.HTTPError as exc:
            raise DatabaseError(str(exc)) from exc

    async def select(
        self, *, where: Row | None = None, columns: str = "*", order: str | None = None, desc: bool = True, limit: int | None = None
    ) -> list[Row]:
        params: dict[str, Any] = {"select": columns, **_filters(where)}
        if order:
            params["order"] = f"{order}.{'desc' if desc else 'asc'}.nullslast"
        if limit:
            params["limit"] = limit
        try:
            response = await self.client.get(f"/{self.name}", params=params)
            _check(response)
            return response.json()
        except (httpx.HTTPError, ValueError) as exc:
            raise DatabaseError(str(exc)) from exc

    async def update(self, where: Row, values: Row) -> None:
        if not where:
            raise DatabaseError("Refusing to update every row")
        try:
            _check(await self.client.patch(f"/{self.name}", params=_filters(where), json=values, headers={"Prefer": "return=minimal"}))
        except httpx.HTTPError as exc:
            raise DatabaseError(str(exc)) from exc

    async def delete(self, where: Row) -> None:
        if not where:
            raise DatabaseError("Refusing to delete every row")
        try:
            _check(await self.client.delete(f"/{self.name}", params=_filters(where), headers={"Prefer": "return=minimal"}))
        except httpx.HTTPError as exc:
            raise DatabaseError(str(exc)) from exc


class SupabaseDatabase:
    kind = "supabase"

    def __init__(self, url: str, secret_key: str) -> None:
        headers = {"apikey": secret_key}
        if secret_key.startswith("eyJ"):  # legacy service_role keys are JWTs and also go in Authorization
            headers["Authorization"] = f"Bearer {secret_key}"
        self.client = httpx.AsyncClient(base_url=f"{url}/rest/v1", headers=headers, timeout=20.0)

    def table(self, name: str) -> SupabaseTable:
        return SupabaseTable(self.client, name)

    async def ping(self) -> bool:
        try:
            await self.table("users").select(columns="id", limit=1)
            return True
        except DatabaseError:
            return False

    async def close(self) -> None:
        await self.client.aclose()
