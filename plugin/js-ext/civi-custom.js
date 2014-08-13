var cohort = '';

function callbacki2b2(json)
{
        //alert( json.status );   
        //json.log
        cohort="";
        var patients = parseInt(json.patients)
        var missing = parseInt(json.missing)
        var trans = patients - missing;

        alert( trans + " out of " + patients + " patients transfered to civicrm");

}

function mvf1()
{
        var displayname = i2b2.ExportXLS.model.prsRecord.sdxInfo.sdxDisplayName;
        //alert( displayname );
        var containsproject = displayname.split("[");
        var project = containsproject[2];
        project = project.substring(0,project.length-2);
        //alert( project );

    	if (cohort != "")
    	{
	        $j.ajax({
	          dataType: 'jsonp',
	          jsonp: 'jsonp_callback',
	          url: 'http://' + window.location.hostname  + ':8080/i2b2WS/rest/service/i2b2callback1/'+cohort.substr(0,cohort.length-1)+'*'+project,
	          success: function (json) {
	          }
	        });
    	}
    	else
    	{
    	    alert("This cohort has no patients, or you may have already exported");
    	}
}
