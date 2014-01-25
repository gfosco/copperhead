
var Leaderboard = Parse.Object.extend("Leaderboard");
var User = Parse.User;

var _ = require('underscore');

// For speed and hack development, the room data is stored in a JSON object.
var roomData = {
  'intro' : {
    'title' : "You are standing in the lobby of building 16 at Facebook.",
    'description' : 'The walls are covered in graffiti..  there is a desk nearby with a security guard.  Maybe you should get a "badge".',
    'actions' : {
      'badge' : {
        'say' : 'You sign in as a visitor, get your badge, and move into the building.\n',
        'actions' : [
          ['addScore',1],
          ['setRoom','sixteen1'],
          ['grantAchievement','intro']
        ]
      }
    }
  },
  'sixteen1' : {
    'title' : "You walk into a room that's full of people with their heads down, writing code.",
    'description' : 'There is a piece of "paper" on the ground by your feet...',
    'actions' : {
      'paper' : {
        'say' : 'You pick up the paper and start to read it.\n',
        'actions' : [
          ['addScore', 10],
          ['grantAchievement','gotPaper'],
          ['setRoom', 'sixteen2']
        ]
      }
    }
  },

  'sixteen2' : {
    'title' : 'The paper says on it: TOP SECRET! No one seems to realize you have it. Do you "drop" it or "keep" going?',
    'description' : 'You should either "drop" the paper, or "keep" going.  Is that a "cake"?',
    'actions' : {
      'keep' : {
        'say' : 'There is a big Parse logo on the paper. Maybe it belongs to the Parse team.\n',
        'actions' : [
          ['addScore', 10],
          ['setRoom', 'sixteen3']
        ]
      },
      'drop' : {
        'say' : 'You drop the paper like it\'s hot and run for the door.\n',
        'actions' : [
          ['setRoom', 'end']
        ]
      },
      'cake' : {
        'say' : 'The cake is a lie!',
        'actions' : [
          ['addScore', 10]
        ]
      }
    }
  },

  'sixteen3' : {
    'title' : "You see a sign near the staircase that has a Parse logo on it.",
    'description' : 'Maybe you should use the "stairs".',
    'actions' : {
      'stairs' : {
        'say' : 'You climb the stairs, and at the top, see a set of desks with a big Parse banner.\n',
        'actions' : [
          ['addScore', 10],
          ['setRoom', 'sixteen4']
        ]
      }
    }
  },

  'sixteen4' : {
    'title' : 'You find the Parse area and see several people working.  Maybe you should "give" them the paper, or "run" away if you\'re a coward.',
    'description' : 'There sure are a lot of couches around.. and is that a "Whiskey" Forest?',
    'actions' : {
      'run' : {
        'say' : 'You run away! People are scary. \n',
        'actions' : [
          ['addScore', 10],
          ['setRoom', 'end']
        ]
      },
      'give' : {
        'say' : 'You hand the closest Parser the piece of paper.\n',
        'actions' : [
          ['addScore', 50],
          ['setRoom', 'sixteen5']
        ]
      },
      'whiskey' : {
        'say' : 'Yes, there\'s a collection of whiskey bottles stored in the office plants.. A sip won\'t be missed.',
        'actions' : [
          ['addScore', 15],
          ['grantAchievement', 'whiskey']
        ]
      }
    }
  },

  'sixteen5' : {
    'title' : "Their eyes widen. You won't believe what happens \"next\"!",
    'description' : 'You should type "next" to continue.',
    'actions' : {
      'next' : {
        'say' : 'Security grabs you by the arm and takes you towards the exit.\n',
        'actions' : [
          ['addScore', 75],
          ['grantAchievement','savedTheDay'],
          ['setRoom', 'end']
        ]
      }
    }
  },

  'end' : {
    'title' : "You're back in the lobby and need to \"return\" your badge.",
    'description' : 'Please "return" your badge to the nice security guard.',
    'actions' : {
      'return' : {
        'say' : 'You have died of dysentary!\n',
        'actions' : [
          ['addScore', 50],
          ['grantAchievement','finishedGame'],
          ['setRoom', 'intro']
        ]
      }
    }
  }

};

// Likewise, achievement text is configured here:
var achievements = {
  'intro' : 'You made it!  Welcome to Disneyland.',
  'intro2': 'Bye!!  You left.',
  'gotPaper': 'Got Paper?',
  'whiskey': 'Drinking on the job.',
  'savedTheDay': 'You are likely to be eaten by a grue.',
  'finishedGame': 'Well that was a short visit...'
};

// When a new user is saved, configure default values.
// When an existing user is saved, validate it
Parse.Cloud.beforeSave(User, function(request, response) {

  if (request.object.isNew()) {
    var user = setUserDefaults(request.object);
    var leaderboardEntry = new Leaderboard();
    leaderboardEntry.set('username', user.get('username'));
    return leaderboardEntry.save().then(function(leaderboard) {
      user.set('leaderboard', leaderboard);
      response.success();
    }, function(error) {
      response.error(error);
    });
  }

  // Just for example purposes.. You may want to do some validation.
  if (saneUserLimits(request.object)) {
    response.success();
  } else {
    response.error('User appears to have invalid values.');
  }

});

// After a user is saved, update their leaderboard entry.
// A better way to do this is to award the score in 'postMain' and prevent the
//   user from updating their score at all.
Parse.Cloud.afterSave(User, function(request) {

  var leaderboard = request.object.get('leaderboard');
  return leaderboard.fetch().then(function(leaderboard) {
    leaderboard.set('score', request.object.get('score'));
    return leaderboard.save();
  });

});

// This will return the title & description of the current room the user is in.
Parse.Cloud.define('getMain', function(request, response) {

  var userRoom = request.user.get('room');
  var room = roomData[userRoom];
  if (room) {
    response.success({'title' : room.title, 'description' : room.description });
  } else {
    response.error('Invalid data.');
  }

});

// Any commands not handled locally by the game will be processed here:
Parse.Cloud.define('postMain', function(request, response) {
  var userRoom = request.user.get('room');
  var room = roomData[userRoom];
  if (room && room.actions[request.params.entry]) {
    var output = {};
    var actions = room.actions[request.params.entry];
    for (var i = 0; i < actions['actions'].length; i++) {
      var action = actions['actions'][i];
      if (action[0] == "setRoom") {
        request.user.set('room', action[1]);
        output['setRoom'] = action[1];
      } else if (action[0] == "addScore") {
        request.user.increment('score', action[1]);
      } else if (action[0] == "grantAchievement") {
        var userAchievements = request.user.get('achievements');
        if (!_.contains(userAchievements,action[1])) {
          request.user.addUnique('achievements', action[1]);
          output['achievement'] = achievements[action[1]];
        }
      }
    }
    request.user.save().then(function(user) {
      output['score'] = user.get('score');
      output['say'] = actions.say;
      response.success(output);
    }, function(error) {
      response.error('Failed saving action.');
    });
  } else {
    response.error('Invalid command.')
  }
});

function setUserDefaults(user) {
  user.set('health', 100);
  user.set('score', 1);
  user.set('inventory', []);
  user.set('achievements', []);
  user.set('room', 'intro');
  return user;
}

function saneUserLimits(user) {
  if (user.get('health') > 500) return false;
  if (user.get('score') > 1000) return false;
  return true;
}