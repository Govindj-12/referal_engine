"""
DAG Cycle Detection Service
============================
Uses DFS (ancestor traversal) to detect cycles in <100ms.
A cycle exists if: adding edge (new_user → referrer) would create
a path referrer → ... → new_user (making new_user reachable from referrer
and referrer reachable from new_user simultaneously).
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
import networkx as nx
from typing import Optional, Set, Dict, List, Tuple
from app.models.models import User, Referral


async def _get_all_edges(db: AsyncSession) -> List[Tuple[str, str]]:
    """Fetch all valid referral edges as (child, parent) tuples."""
    result = await db.execute(
        select(Referral.new_user_id, Referral.referrer_id).where(
            Referral.is_valid == True
        )
    )
    return result.fetchall()


async def build_graph(db: AsyncSession) -> nx.DiGraph:
    """Build full DAG from DB."""
    edges = await _get_all_edges(db)
    G = nx.DiGraph()
    for child, parent in edges:
        G.add_edge(child, parent)  # edge: child → parent
    return G


async def would_create_cycle(
    db: AsyncSession, new_user_id: str, referrer_id: str
) -> bool:
    """
    Check if adding edge (new_user → referrer) creates a cycle.
    A cycle exists if referrer is already an ancestor/descendant of new_user.
    
    We check: is there a path from referrer_id → new_user_id?
    If yes, adding new_user_id → referrer_id would close the cycle.
    """
    G = await build_graph(db)
    
    # Add the proposed edge temporarily
    G.add_edge(new_user_id, referrer_id)
    
    # Check if graph is still a DAG
    return not nx.is_directed_acyclic_graph(G)


async def get_ancestors(
    db: AsyncSession, user_id: str, max_depth: int = 10
) -> List[Dict]:
    """Get all ancestors up to max_depth for reward propagation."""
    G = await build_graph(db)
    ancestors = []
    
    visited: Set[str] = set()
    queue = [(user_id, 0)]
    
    while queue:
        current, depth = queue.pop(0)
        if depth >= max_depth or current in visited:
            continue
        visited.add(current)
        
        successors = list(G.successors(current))
        for parent in successors:
            if depth + 1 <= max_depth:
                ancestors.append({"user_id": parent, "depth": depth + 1})
                queue.append((parent, depth + 1))
    
    return ancestors


async def get_user_subgraph(
    db: AsyncSession, user_id: str, depth: int = 3
) -> Tuple[List[str], List[Tuple[str, str]]]:
    """
    Get subgraph of nodes within `depth` hops from user_id.
    Returns (node_ids, edges)
    """
    G = await build_graph(db)
    
    # BFS in both directions for visibility
    nodes: Set[str] = {user_id}
    edges_found: Set[Tuple[str, str]] = set()
    
    # Go downstream (children)
    frontier = {user_id}
    for _ in range(depth):
        next_frontier = set()
        for n in frontier:
            preds = list(G.predecessors(n))
            for p in preds:
                nodes.add(p)
                edges_found.add((p, n))
                next_frontier.add(p)
        frontier = next_frontier
    
    # Go upstream (ancestors)
    frontier = {user_id}
    for _ in range(depth):
        next_frontier = set()
        for n in frontier:
            succs = list(G.successors(n))
            for s in succs:
                nodes.add(s)
                edges_found.add((n, s))
                next_frontier.add(s)
        frontier = next_frontier
    
    return list(nodes), list(edges_found)
