-- Clean up broken groups with NULL id
DELETE FROM groups WHERE id IS NULL;

-- Clean up orphaned group_members with NULL group_id
DELETE FROM group_members WHERE group_id IS NULL;