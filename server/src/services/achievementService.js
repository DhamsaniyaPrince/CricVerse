const Player = require('../models/Player');
const Team = require('../models/Team');
const Match = require('../models/Match');
const Tournament = require('../models/Tournament');

const recalculatePlayerAchievements = async (playerId) => {
  try {
    const player = await Player.findById(playerId);
    if (!player) return;

    const achievements = [...player.achievements];
    const originalCount = achievements.length;

    const hasAchievement = (title) => achievements.some(a => a.title === title);

    const addAchievement = (title, description) => {
      if (!hasAchievement(title)) {
        achievements.push({
          title,
          description,
          date: new Date()
        });
      }
    };

    // 1. MVP achievement
    const mvpMatches = (player.matchHistory || []).filter(m => m.mvpStatus);
    if (mvpMatches.length >= 1) {
      addAchievement('MVP', 'Awarded for winning the Most Valuable Player accolade in a match.');
    }

    // 2. Top Performer achievement (50+ runs or 3+ wickets in a single match)
    const topMatch = (player.matchHistory || []).some(m => (m.runs || 0) >= 50 || (m.wickets || 0) >= 3);
    if (topMatch) {
      addAchievement('Top Performer', 'Scored 50+ runs or took 3+ wickets in a single match.');
    }

    // 3. Tournament Winner achievement
    const teams = await Team.find({ players: playerId });
    const teamIds = teams.map(t => t._id.toString());
    
    if (teamIds.length > 0) {
      const wonTournaments = await Tournament.find({ status: 'Completed' });
      let won = false;
      for (const tourney of wonTournaments) {
        if (tourney.pointsTable && tourney.pointsTable.length > 0) {
          const topTeamEntry = tourney.pointsTable[0];
          if (topTeamEntry && topTeamEntry.team && teamIds.includes(topTeamEntry.team.toString())) {
            won = true;
            break;
          }
        }
      }
      if (won) {
        addAchievement('Tournament Winner', 'Member of a tournament championship winning squad.');
      }
    }

    // 4. Winning Streak achievement (3+ consecutive matches won by player's team)
    let winsStreak = 0;
    let maxStreak = 0;
    const sortedMatches = [...(player.matchHistory || [])].sort((a, b) => new Date(a.date) - new Date(b.date));

    for (const item of sortedMatches) {
      const match = await Match.findById(item.matchId);
      if (match && match.result && match.result.winner) {
        let playerTeam = null;
        if (match.playingXIA.some(id => id.toString() === playerId.toString())) {
          playerTeam = match.teamA;
        } else if (match.playingXIB.some(id => id.toString() === playerId.toString())) {
          playerTeam = match.teamB;
        } else {
          playerTeam = player.currentTeam?._id;
        }

        if (playerTeam && match.result.winner.toString() === playerTeam.toString()) {
          winsStreak++;
          if (winsStreak > maxStreak) maxStreak = winsStreak;
        } else {
          winsStreak = 0;
        }
      } else {
        winsStreak = 0;
      }
    }

    if (maxStreak >= 3) {
      addAchievement('Winning Streak', 'Awarded for being on a 3+ match winning streak.');
    }

    // 5. Team Legend achievement (Played 5+ matches for a team or captain of a team)
    let isLegend = false;
    const captainOfTeam = await Team.exists({ captain: playerId });
    if (captainOfTeam) {
      isLegend = true;
    } else {
      const teamMatchCounts = {};
      for (const item of player.matchHistory || []) {
        const match = await Match.findById(item.matchId);
        if (match) {
          let playerTeamId = null;
          if (match.playingXIA.some(id => id.toString() === playerId.toString())) {
            playerTeamId = match.teamA.toString();
          } else if (match.playingXIB.some(id => id.toString() === playerId.toString())) {
            playerTeamId = match.teamB.toString();
          }
          if (playerTeamId) {
            teamMatchCounts[playerTeamId] = (teamMatchCounts[playerTeamId] || 0) + 1;
          }
        }
      }
      const hasFiveMatches = Object.values(teamMatchCounts).some(count => count >= 5);
      if (hasFiveMatches) {
        isLegend = true;
      }
    }

    if (isLegend) {
      addAchievement('Team Legend', 'Played 5+ matches for a single team or served as Team Captain.');
    }

    // Save if updated
    if (achievements.length > originalCount) {
      player.achievements = achievements;
      await player.save();
    }
  } catch (err) {
    console.error(`Error checking achievements for player ${playerId}: ${err.message}`);
  }
};

module.exports = { recalculatePlayerAchievements };
