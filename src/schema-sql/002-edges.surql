-- Nexo Edge Relation Table
-- Single relation table for all typed edges between nodes

DEFINE TABLE IF NOT EXISTS edge TYPE RELATION IN node OUT node SCHEMALESS;

-- Edge type discriminator
DEFINE FIELD OVERWRITE type ON TABLE edge TYPE string
  ASSERT $value IN ["RENDERS", "CHILD_OF", "TRIGGERS", "CALLS", "REQUIRES_STATE", "TRANSITIONS_TO", "READS", "WRITES", "HAS_FIELD", "REFERENCES", "VALIDATES", "CONSTRAINS", "AUTHORIZES", "BELONGS_TO", "DEPENDS_ON", "HOSTED_ON", "STORED_IN", "NAVIGATES_TO", "DISPLAYS", "ACCEPTS_INPUT", "IMPLEMENTED_IN"];

-- Timestamp
DEFINE FIELD IF NOT EXISTS createdAt ON TABLE edge TYPE datetime DEFAULT time::now();
