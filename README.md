# Plans

* Scheduled Github action to check sweep page for new pdf file
* if new pdf file found - kick off job to download and parse file
* in github action create github pull request to add data to repo
* on branch update github action to generate html from data and push to github pages

so need a 
[ ] find pdf file in html page script
[ ] check if pdf file is new script
[ ] parse pdf to json data script
[ ] github actions to wire everything up
[ ] static site generator to build pages from json data
[ ] static site page to display data