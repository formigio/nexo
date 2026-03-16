-- Nexo Node Table
-- Single table with type discriminator field for all node types

DEFINE TABLE IF NOT EXISTS node SCHEMAFULL;

-- Common fields
DEFINE FIELD OVERWRITE type ON TABLE node TYPE string
  ASSERT $value IN ["Screen", "Component", "UserState", "UserAction", "APIEndpoint", "DataEntity", "DataField", "BusinessRule", "Feature", "InfraResource", "SourceFile", "Account"];
DEFINE FIELD IF NOT EXISTS app ON TABLE node TYPE string;
DEFINE FIELD IF NOT EXISTS name ON TABLE node TYPE string;
DEFINE FIELD IF NOT EXISTS description ON TABLE node TYPE option<string>;
DEFINE FIELD IF NOT EXISTS tags ON TABLE node TYPE array<string> DEFAULT [];

-- Type-specific properties stored in a flexible object
DEFINE FIELD IF NOT EXISTS props ON TABLE node TYPE object FLEXIBLE DEFAULT {};

-- Timestamps and metadata
DEFINE FIELD IF NOT EXISTS createdAt ON TABLE node TYPE datetime DEFAULT time::now();
DEFINE FIELD IF NOT EXISTS updatedAt ON TABLE node TYPE datetime DEFAULT time::now();
DEFINE FIELD IF NOT EXISTS createdBy ON TABLE node TYPE option<string>;
DEFINE FIELD IF NOT EXISTS version ON TABLE node TYPE int DEFAULT 1;
