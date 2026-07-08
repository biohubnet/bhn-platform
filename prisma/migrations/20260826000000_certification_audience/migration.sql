-- Persona/audience dimension on certification programs: which trainee
-- sub-types (masters | phd | postdoc | research_associate | lab_technician)
-- a program is designed for. Additive.
ALTER TABLE "CertificationProgram" ADD COLUMN "audience" TEXT[] NOT NULL DEFAULT ARRAY[]::text[];
