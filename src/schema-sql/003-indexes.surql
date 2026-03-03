-- Nexo Indexes

-- Node indexes
DEFINE INDEX IF NOT EXISTS idx_node_type_app ON TABLE node FIELDS type, app;
DEFINE INDEX IF NOT EXISTS idx_node_app ON TABLE node FIELDS app;
DEFINE INDEX IF NOT EXISTS idx_node_name ON TABLE node FIELDS name;

-- Edge indexes
DEFINE INDEX IF NOT EXISTS idx_edge_type ON TABLE edge FIELDS type;
DEFINE INDEX IF NOT EXISTS idx_edge_unique ON TABLE edge FIELDS in, out, type UNIQUE;
