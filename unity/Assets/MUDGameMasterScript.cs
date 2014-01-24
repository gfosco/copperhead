using UnityEngine;
using System.Collections;
using System.Collections.Generic;
using Parse;

public class MUDGameMasterScript : MonoBehaviour {

	GameObject textView;
	GameObject achievement;
	TerminalTextController textController;
	AchievementController achievementController;
	string state = "login";
	ArrayList storage;
	IDictionary<string, object> roomData;

	// Use this for initialization
	void Start () {
		textView = GameObject.Find("terminalText");
		textController = textView.GetComponent<TerminalTextController>();
		achievement = GameObject.Find("achievement");
		achievementController = achievement.GetComponent<AchievementController>();
		storage = new ArrayList();
		InitializePlay();
		ParseAnalytics.TrackAppOpenedAsync();
	}
	
	// Update is called once per frame
	void Update () {

	}
	
	void InitializePlay() {

		textController.addLines ("Copperhead v0.0.1\n\nAn example of Parse integration with Unity.\n");
		if (ParseUser.CurrentUser != null) {
			startState("main");
		} else {
			startState("login");
		}

	}

	// will be used to display stars instead of characters for password fields.
	public bool secureInput() {
		if (state == "login2" || state == "signup2") return true;
		return false;
	}

	// kitchen sink handler for text input
	public void handleCommand(string entry) {
		string entryRaw = entry.Trim();
		entry = entryRaw.ToLower();
		if (entry == "") {
			textController.showPrompt ();
			return;
		}
		if (state == "login" || state == "signup") {
			if (entry == "new") {
				startState("signup");
			} else {
				storage.Add (entryRaw);
				startState(state + "2");
			}
		} else if (state == "login2") {
			string username = storage[0].ToString();
			storage.Clear();
			ParseUser.LogInAsync (username, entry).ContinueWith(t =>
			{
				// Could do better error handling here and actually inspect the error.
				if (t.IsFaulted || t.IsCanceled) {
					textController.addLines ("The login failed.  Either the password was wrong or the user does not exist.");
					startState ("login");
				} else {
					startState ("main");
				}
			});
		} else if (state == "signup2") {
			string username = storage[0].ToString();
			storage.Clear();
			var user = new ParseUser()
			{
				Username = username,
				Password = entry
			};
			user.SignUpAsync().ContinueWith(t => {
				// Could do better error handling here and actually inspect the error.
				if (t.IsFaulted || t.IsCanceled) {
					textController.addLines ("The signup failed.  That username may already exist.");
					startState ("signup");
				} else {
					startState ("main");
				}
			});
		} else { // if (state == "main") {

			var dimensions = new Dictionary<string, string> {
				{"command", entry},
				{"room", state}
			};
			ParseAnalytics.TrackEventAsync("command", dimensions);

			if (entry == "logout") {
				textController.addLines("Logging you out.. see ya later!\n");
				ParseUser.LogOut();
				startState("login");
			} else if (entry == "help") {
				textController.addLines ("Available commands:");
				textController.addLines ("help          display this list");
				textController.addLines ("look          show the description for this room");
				textController.addLines ("score         display your score");
				textController.addLines ("health        display your health");
				textController.addLines ("leaderboard   show the top 10 scores");
				textController.addLines ("go            perform the only action available currently");
				textController.addLines ("createobject  test object creation");
				textController.addLines ("logout        end your session");
				textController.showPrompt(); 
			} else if (entry == "createobject") {
				// Example of creating a simple parse object
				var obj = ParseObject.Create ("TestObject");
				obj["foo"] = "bar";
				obj.SaveAsync().ContinueWith(t => {
					if (t.IsFaulted || t.IsCanceled) {
						textController.addLines ("Object creation failed.");
						textController.showPrompt ();
					} else {
						textController.addLines ("TestObject created with id " + obj.ObjectId + "\n");
						textController.showPrompt();
					}
				});
			} else if (entry == "look") {
				textController.addLines(roomData["description"].ToString());
				textController.showPrompt();
			} else if (entry == "eat me") {
				textController.addLines("Auto-cannibalism is not the answer.");
				textController.showPrompt();
			} else if (entry == "score") {
				textController.addLines("Your score is: " + ParseUser.CurrentUser.Get<int>("score").ToString());
				textController.showPrompt();
			} else if (entry == "health") {
				textController.addLines("Your health is: " + ParseUser.CurrentUser.Get<int>("health").ToString());
				textController.showPrompt();
			} else if (entry == "leaderboard") {
				var query = new ParseQuery<ParseObject>("Leaderboard").OrderByDescending("score").Limit(10);
				query.FindAsync().ContinueWith(t => {
					if (t.IsCanceled || t.IsFaulted) {
						textController.addLines("Leaderboard listing failed.");
						textController.showPrompt();
					} else {
						textController.addLines ("\nLeaderboard:\n-----------\n");
						IEnumerable<ParseObject> results = t.Result;
						foreach (ParseObject leader in results) {
							textController.addLines (leader.Get<int>("score").ToString() + " (" + leader.Get<string>("username") + ")");
						}
						textController.addLines ("\n");
						textController.showPrompt();
					}
				});
			} else {
				ParseCloud.CallFunctionAsync<IDictionary<string, object>>("postMain", new Dictionary<string, object>(){
					{"entry", entry}, {"entryRaw", entryRaw}
				}).ContinueWith(t => {
					if (t.IsCanceled || t.IsFaulted) {
						textController.addLines("I do not know the command '" + entry + "'.\nOkay, what do you want to do now?");
						textController.showPrompt();
					} else {
						ParseUser.CurrentUser.FetchAsync();
						IDictionary<string, object> result = t.Result;
						textController.addLines(result["say"].ToString());
						if (result.Keys.Contains("achievement")) {
							achievementController.addAchievement(result["achievement"].ToString());
						}
						if (result.Keys.Contains("setRoom") && result["setRoom"].ToString() != state) {
							state = result["setRoom"].ToString();
							getState();
						} else {
							textController.showPrompt();
						}
					}
				});			
			}
		}
		
	}
	
	public void startState(string newState) {
	
		state = newState;
		if (newState == "login") {
			textController.addLines("\nWhat's your name? (If you're new here, say 'new')");
			textController.showPrompt();
		} else if (newState == "signup") {
			textController.addLines ("Oh, well hi!  What should I call you?");
			textController.showPrompt();
		} else if (newState == "login2") {
			textController.addLines ("Ok, " + textController.getEntry() + ".  What is your password?");
			textController.showPrompt();
	    } else if (newState == "signup2") {
			textController.addLines ("Alright, now pick a password:");
			textController.showPrompt();
		} else if (newState == "main") {
			textController.addLines ("Welcome, " + ParseUser.CurrentUser.Get<string>("username") + "!\n\nType help for a list of commands.\n");
			getState();
		}
	}
	
	public void getState() {
		ParseCloud.CallFunctionAsync<IDictionary<string, object>>("getMain", new Dictionary<string, object>()).ContinueWith(t => {
			if (t.IsCanceled || t.IsFaulted) {
				textController.addLines("There was a problem getting the game state.  Please refresh the page and try again.");
				textController.showPrompt();
			} else {
				IDictionary<string, object> result = t.Result;
				roomData = result;
				textController.addLines(result["title"].ToString());
				textController.showPrompt();
			}
		});
	}
}

