const Team = require('../models/Team');
const User = require('../models/User');
const Player = require('../models/Player');
const TeamMembership = require('../models/TeamMembership');

const migrateExistingTeams = async () => {
  try {
    console.log('Running team roles and membership migration...');
    const teams = await Team.find();
    let migratedCount = 0;

    for (const team of teams) {
      if (!team.owner) continue;

      // Find if owner already has a membership in this team
      let membership = await TeamMembership.findOne({ teamId: team._id, userId: team.owner });
      if (!membership) {
        // Find or create Player profile corresponding to owner user
        const ownerUser = await User.findById(team.owner);
        if (ownerUser) {
          let playerProfile = await Player.findOne({ name: ownerUser.username });
          if (!playerProfile) {
            playerProfile = await Player.create({
              name: ownerUser.username,
              role: 'Batsman',
              battingStyle: 'Right-hand bat'
            });
          }

          // Make sure owner player is in team.players
          const playerIds = team.players.map(p => p.toString());
          if (!playerIds.includes(playerProfile._id.toString())) {
            team.players.push(playerProfile._id);
          }
          
          if (!team.captain) {
            team.captain = playerProfile._id;
          }
          await team.save();

          await TeamMembership.create({
            teamId: team._id,
            userId: team.owner,
            teamRole: 'Captain'
          });
          migratedCount++;
          console.log(`Migrated team "${team.name}": Assigned owner "${ownerUser.username}" as Captain`);
        }
      }
    }
    console.log(`Team membership migration completed successfully. Migrated ${migratedCount} teams.`);
  } catch (error) {
    console.error('Error running team migration:', error);
  }
};

module.exports = { migrateExistingTeams };
