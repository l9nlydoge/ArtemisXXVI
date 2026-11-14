export enum Role {
  PrincipalInvestigator = 'PrincipalInvestigator',
  SpacecraftEngineer = 'SpacecraftEngineer',
  MissionOps = 'MissionOps',
  ProgramManager = 'ProgramManager',
}

export const AllRoles: readonly Role[] = [
  Role.PrincipalInvestigator,
  Role.SpacecraftEngineer,
  Role.MissionOps,
  Role.ProgramManager,
]
