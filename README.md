copperhead
==========

An example Unity + Parse project.

## Setup:

1. Create a Parse App. [link](https://parse.com/apps/new)
2. Install the Parse CLI and run 'parse new' to create a Cloud Code folder for your app. [link](https://parse.com/docs/cloud_code_guide#started)
3. Copy the cloud folder from this repo in to your cloud folder.
4. Create a GameData class in the Parse data browser and create a row with an ACL of {}
5. Paste the objectId of the GameData object into cloud/main.js
6. Open the Unity project and paste your Parse App ID and .NET Key on the ParseInitialize GameObject in the mainScene.
7. Build your app and put the output in public/
8. Rename the .html file to index.html
9. Select a sub-domain for your app in the Parse settings dashboard. 
10. Run 'parse deploy' 


