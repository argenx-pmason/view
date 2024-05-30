# View

On the end of the app URL you can use parms to specify the file you want to view:

?lsaf=/general/biostat/jobs/dashboard/dev/output/sapxlsx/sap_updates.json

Examples:
    <https://xarprod.ondemand.sas.com/lsaf/filedownload/sdd%3A///general/biostat/tools/view/index.html?lsaf=/general/biostat/jobs/dashboard/dev/output/sapxlsx/sap_updates.json>

Ideas:
    - display changed values in a color so we know what has been changed
    - columns that can be edited can be specified via a parm
    - add CSV support to view and edit

[10:19] Jean-Michel Bodart
if you have columns with long text strings e.g. paths to show, and they all start with  the same text, it might be useful to make the text right-aligned in the cells so you can see the interesting part (=the last characters) without having to display the whole string by widening the column; would that be easily implementable ?
[10:29] Phil Mason
thats a good idea - should be easy to either right justify everything or work out what is over a length and do it to that. I might add some options that a user can specify and then save them to local storage

# column types
- 'string' (default)    string
- 'number'	            number
- 'date'	            Date() object
- 'dateTime'	        Date() object
- 'boolean'             boolean
- 'singleSelect'        A value in .valueOptions
- 'actions'             Not applicable