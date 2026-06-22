# Mindmap Multi-select and Bulk Delete Design

## Goal

Allow `.mind` boards to select several nodes with Shift-click or a marquee and
delete them together, without changing the persisted mindmap format.

## Selection model

Selection is transient view state owned by `mindmapview.ts` as a `Set<string>`.
It is never serialized into node data.

- Plain click on a node replaces the set with that node.
- Shift-click toggles that node in the set.
- Click on empty canvas or Escape clears the set.
- A completed marquee replaces the set with every non-root node whose rendered
  rectangle intersects the marquee.
- jsMind's own selected node remains the primary node for existing add, rename,
  and formatting controls. The most recently clicked node becomes primary.

Every selected node receives an MDflow-owned CSS class. The highlight uses theme
variables (`--accent`, `--selection`, and `--bg`) so it remains visible in every
theme without writing style data into the document.

## Marquee interaction and hit testing

Marquee starts only from the empty board surface with the primary mouse button.
After a small movement threshold, a positioned overlay rectangle is drawn inside
the board wrapper. Pointer coordinates and node `getBoundingClientRect()` values
are compared in viewport coordinates.

The pure hit-test helper accepts a marquee rectangle and `{id, rect}` node entries.
Intersection, including partial overlap, selects a node. The root is filtered by
the DOM adapter before calling the helper.

Node dragging keeps its existing behavior because a press that starts on a
`jmnode` is routed to the node-drag path, not marquee selection.

## Delete semantics

Delete/Backspace and the toolbar Delete button operate on the selection set. If
the set is empty, they fall back to jsMind's current selected node.

jsMind's existing `remove_node` deletes a node and its descendants. Before bulk
deletion, selected ids are reduced to deletion roots:

- the mindmap root is never deletable;
- a selected node is omitted when any selected ancestor is already a deletion
  root;
- each remaining root is removed once with the existing `remove_node` API.

This matches current single-delete subtree behavior and cannot orphan children.
After deletion, selection is cleared and normal jsMind change persistence runs.

## Pure logic

`src/mindmap-selection.ts` contains:

- replace/toggle/clear selection helpers returning fresh sets;
- rectangle intersection and marquee hit testing;
- deletion-root reduction from selected ids plus parent relationships.

Vitest covers each operation and nested deletion cases. DOM event wiring stays
thin in `mindmapview.ts`.

## Non-goals

- No persistent selection in `.mind` files.
- No multi-node formatting in this slice.
- No changes to jsMind or vendored code.
