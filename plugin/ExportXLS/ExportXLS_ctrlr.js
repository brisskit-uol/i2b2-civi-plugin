/**
 * @projectDescription	Excel Export Plugin 
 * @inherits	i2b2
 * @namespace	i2b2.ExportXLS
 * @author	Mauro Bucalo
 * @version 	1.5
 * ----------------------------------------------------------------------------------------
 * updated 
 * 2011-06-10: 	Initial Launch [Mauro Bucalo, Dipartimento di Informatica e Sistemistica, Universita' di Pavia] 
 * 2011-07-18:  Updated i2b2.ExportXLS.getResults [S. Wayne Chan, Bio-Medical Informatics Core Development Group, HIIS Div., QHS Dept., University of Massachusetts Medical School]
 *              to a) remove event_set in PDO response; b) update patient_list params to render this plugin v1.3 compatible; c) add table title (caption);
 *                 d) add new 1st column for patient row counts (no column title); e) rename the StateCity column title to State/City; 
 *                 f) remove any leading redundant "Zip codes" and trailing actual zipcode value from each state string;
 *                 g) default to using concept_cd for each selected concept entry if neither tval_char nor nval_num is available; & h) improve efficiencies. 
 * 2012-02-13:  Added i2b2.ExportXLS.dropColumns & updated i2b2.ExportXLS.getResults [S. Wayne Chan, BMI-Core Dev Grp, HIIS Div., QHS Dept., UMassMed]
 *              to a) facilitate the more flexible dropping of certain columns (that may contain data too sensitive or too personal) from the resulting table; 
 *                 b) fix the Internet Explorer (IE) hung problem; c) fix the missing concept columns on IE problem; &
 *                 d) fix the blank patient_IDs (when "Include Patient Data" not selected) on IE problem.
 */


///swc20120210
/******************************************************************************************************************************
 * change the content of the returning String to specify certain columns to be dropped from the resulting table
 ******************************************************************************************************************************/
i2b2.ExportXLS.dropColumns = function() {
  //return "Vital Status, Birth Date, Birth Year, Sex, Age, Language, Race, Religion, Marital Status, Zip Code, State\City, Income"; // for ref only (full list of droppable columns), do not uncomment
  //return "Birth Year"; // to drop just this column from the table
  return "Birth Date, Zip Code"; // to drop these 2 columns from the table
}
///


/************************************* NOTE: DO NOT CHANGE ANYTHING BEYOND THIS POINT *****************************************/

i2b2.ExportXLS.Init = function(loadedDiv) {
	// register DIV as valid DragDrop target for Patient Record Sets (PRS) objects
	var op_trgt = {dropTarget:true};
	i2b2.sdx.Master.AttachType("ExportXLS-CONCPTDROP", "CONCPT", op_trgt);
	i2b2.sdx.Master.AttachType("ExportXLS-PRSDROP", "PRS", op_trgt);
	// drop event handlers used by this plugin
	i2b2.sdx.Master.setHandlerCustom("ExportXLS-CONCPTDROP", "CONCPT", "DropHandler", i2b2.ExportXLS.conceptDropped);
	i2b2.sdx.Master.setHandlerCustom("ExportXLS-PRSDROP", "PRS", "DropHandler", i2b2.ExportXLS.prsDropped);
	// array to store concepts
	i2b2.ExportXLS.model.concepts = [];
	// set default output options
	i2b2.ExportXLS.model.outputOptions = {};
	i2b2.ExportXLS.model.outputOptions.patients = true;
	//i2b2.ExportXLS.model.outputOptions.events = true;
	//i2b2.ExportXLS.model.outputOptions.observations = true;

	// manage YUI tabs
	this.yuiTabs = new YAHOO.widget.TabView("ExportXLS-TABS", {activeIndex:0});
	this.yuiTabs.on('activeTabChange', function(ev) { 
		//Tabs have changed 
		if (ev.newValue.get('id')=="ExportXLS-TAB1") {
			// user switched to Results tab
			if (i2b2.ExportXLS.model.concepts.length>0 && i2b2.ExportXLS.model.prsRecord) {
			// contact PDO only if we have data 
			if (i2b2.ExportXLS.model.dirtyResultsData) {
					// recalculate the results only if the input data has changed
					i2b2.ExportXLS.getResults();
				}
			}
		}
	});
};

i2b2.ExportXLS.Unload = function() {
	// purge old data
	i2b2.ExportXLS.model.prsRecord = false;
	i2b2.ExportXLS.model.conceptRecord = false;
	i2b2.ExportXLS.model.dirtyResultsData = true;
	i2b2.ExportXLS.model.outputOptions.patients = true;
	i2b2.ExportXLS.model.outputOptions.events = true;
	i2b2.ExportXLS.model.outputOptions.observations = true;
	return true;
};

i2b2.ExportXLS.prsDropped = function(sdxData) {
	sdxData = sdxData[0];	// only interested in first record
	// save the info to our local data model
	i2b2.ExportXLS.model.prsRecord = sdxData;
	// let the user know that the drop was successful by displaying the name of the patient set
	$("ExportXLS-PRSDROP").innerHTML = i2b2.h.Escape(sdxData.sdxInfo.sdxDisplayName);
	// temporarly change background color to give GUI feedback of a successful drop occuring
	$("ExportXLS-PRSDROP").style.background = "#CFB";
	setTimeout("$('ExportXLS-PRSDROP').style.background='#DEEBEF'", 250);	
	// optimization to prevent requerying the hive for new results if the input dataset has not changed
	i2b2.ExportXLS.model.dirtyResultsData = true;		
};

i2b2.ExportXLS.conceptDropped = function(sdxData) {
	sdxData = sdxData[0];	// only interested in first record
	// save the info to our local data model
	var nameD = sdxData.sdxInfo.sdxDisplayName;
	if(i2b2.ExportXLS.model.concepts.length) {
		var flagConcept = false;
		for (var i3 = 0; i3 < i2b2.ExportXLS.model.concepts.length; i3++) {
			var nameC = i2b2.ExportXLS.model.concepts[i3].sdxInfo.sdxDisplayName;
			if (nameC == nameD){
				flagConcept = true;
			}
			else{
				// do nothing, flagConcept stay false;
			}
			nameC = "";
		}
		if(!flagConcept) {
			i2b2.ExportXLS.model.concepts.push(sdxData);
			// sort and display the concept list
			i2b2.ExportXLS.conceptsRender();
			// optimization to prevent requerying the hive for new results if the input dataset has not changed
			i2b2.ExportXLS.model.dirtyResultsData = true;
		}
		else {
			alert("Impossible to drag a duplicate concept !!");
		}	
	}
	else {
		i2b2.ExportXLS.model.concepts.push(sdxData);
		// sort and display the concept list
		i2b2.ExportXLS.conceptsRender();
		// optimization to prevent requerying the hive for new results if the input dataset has not changed
		i2b2.ExportXLS.model.dirtyResultsData = true;
	}
	// avoid pushing duplicate concepts 
	
			
};

i2b2.ExportXLS.conceptDelete = function(concptIndex) {
	// remove the selected concept
	i2b2.ExportXLS.model.concepts.splice(concptIndex,1);
	// sort and display the concept list
	i2b2.ExportXLS.conceptsRender();
	// optimization to prevent requerying the hive for new results if the input dataset has not changed
	i2b2.ExportXLS.model.dirtyResultsData = true;		
};

i2b2.ExportXLS.chgOutputOption = function(ckBox,option) {
	i2b2.ExportXLS.model.outputOptions[option] = ckBox.checked;
	i2b2.ExportXLS.model.dirtyResultsData = true;
};

i2b2.ExportXLS.conceptsRender = function() {
	var s = '';
	// are there any concepts in the list
	if (i2b2.ExportXLS.model.concepts.length) {
		// sort the concepts in alphabetical order
		i2b2.ExportXLS.model.concepts.sort(function() {return arguments[0].sdxInfo.sdxDisplayName > arguments[1].sdxInfo.sdxDisplayName});
		// draw the list of concepts
		for (var i1 = 0; i1 < i2b2.ExportXLS.model.concepts.length; i1++) {
			if (i1 > 0) { s += '<div class="concptDiv"></div>'; }
			s += '<a class="concptItem" href="JavaScript:i2b2.ExportXLS.conceptDelete('+i1+');">' + i2b2.h.Escape(i2b2.ExportXLS.model.concepts[i1].sdxInfo.sdxDisplayName) + '</a>';
		}
		// show the delete message
		$("ExportXLS-DeleteMsg").style.display = 'block';
	} else {
		// no concepts selected yet
		s = '<div class="concptItem">Drop one or more Concepts here</div>';
		$("ExportXLS-DeleteMsg").style.display = 'none';
}
	// update html
	$("ExportXLS-CONCPTDROP").innerHTML = s;
};

i2b2.ExportXLS.chgOutputOption = function(ckBox,option) {
	i2b2.ExportXLS.model.outputOptions[option] = ckBox.checked;
	i2b2.ExportXLS.model.dirtyResultsData = true;
};

i2b2.ExportXLS.getResults = function() {

	if (i2b2.ExportXLS.model.dirtyResultsData) {
		// translate the concept XML for injection as PDO item XML 
		var filterList = '';
		for (var i1=0; i1<i2b2.ExportXLS.model.concepts.length; i1++) {
			var t = i2b2.ExportXLS.model.concepts[i1].origData.xmlOrig;
			var cdata = {};
			cdata.level = i2b2.h.getXNodeVal(t, "level");
			cdata.key = i2b2.h.getXNodeVal(t, "key");
			cdata.tablename = i2b2.h.getXNodeVal(t, "tablename");
			cdata.dimcode = i2b2.h.getXNodeVal(t, "dimcode");
			cdata.synonym = i2b2.h.getXNodeVal(t, "synonym_cd");
			filterList +=
			'	<panel name="'+cdata.key+'">\n'+
			'		<panel_number>0</panel_number>\n'+
			'		<panel_accuracy_scale>0</panel_accuracy_scale>\n'+
			'		<invert>0</invert>\n'+
			'		<item>\n'+
			'			<hlevel>'+cdata.level+'</hlevel>\n'+
			'			<item_key>'+cdata.key+'</item_key>\n'+
			'			<dim_tablename>'+cdata.tablename+'</dim_tablename>\n'+
			'			<dim_dimcode>'+cdata.dimcode+'</dim_dimcode>\n'+
			'			<item_is_synonym>'+cdata.synonym+'</item_is_synonym>\n'+ 
			'		</item>\n'+
			'	</panel>\n';
		}

		var output_options = '';
		
		output_options += '	<patient_set select="using_input_list" onlykeys="false"/>\n';
		//swc20110715 removed the event_set (currently not used) to reduce PDO response size & improve performance
		//output_options += '	<event_set select="using_input_list" onlykeys="false"/>\n';
		output_options += '	<observation_set blob="false" onlykeys="false"/>\n';
		
		var msg_filter = '<input_list>\n' +
		//swc20110715 updated patient_list params to be v1.3 compatible (otherwise no data would be returned)
		//	'	<patient_list>\n'+   // 
			'	<patient_list max="99999" min="0">\n'+   // <--- same as in "Dem1Set" plugin, for v1.3 compatibility
			'		<patient_set_coll_id>'+i2b2.ExportXLS.model.prsRecord.sdxInfo.sdxKeyValue+'</patient_set_coll_id>\n'+
			'	</patient_list>\n'+
			'</input_list>\n'+
			'<filter_list>\n'+
				filterList+
			'</filter_list>\n'+
			'<output_option>\n'+
				output_options+
			'</output_option>\n';


		// callback processor
		var scopedCallback = new i2b2_scopedCallback();
		scopedCallback.scope = this;
		scopedCallback.callback = function(results) {
			// THIS function is used to process the AJAX results of the getChild call
			//		results data object contains the following attributes:
			//			refXML: xmlDomObject <--- for data processing
			//			msgRequest: xml (string)
			//			msgResponse: xml (string)
			//			error: boolean
			//			errorStatus: string [only with error=true]
			//			errorMsg: string [only with error=true]
			
			// check for errors
			if (results.error) {
				alert('The results from the server could not be understood.  Press F12 for more information.');
				console.error("Bad Results from Cell Communicator: ",results);
				return false;
			}

		     ///swc20120210 fixed the Internet explorer hung problem
		     var res;
		     var xmlDoc;
		     if (window.DOMParser) { // not Internet Explorer
			var parser = new DOMParser();
			//var xmlDoc = parser.parseFromString(results.msgResponse,"text/xml"); 
			xmlDoc = parser.parseFromString(results.msgResponse,"text/xml"); 
                        res = results.msgResponse; // for Chrome, Safari, & FireFox (FF)
		     } else { // Internet Explorer
			xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
			xmlDoc.async = false;
			xmlDoc.loadXML(results.msgResponse);
			res = xmlDoc; // for IE, & FF
		     }
		     ///
			var tab = "";
			var columnNr = "";
			var arrayCol = {};
			///swc20120210 added for replacing birthdate with birthyear
			var birthyrOnly = false;

			if (i2b2.ExportXLS.model.outputOptions.patients) {
				//swc20110718 added table title (caption) as well as new first column for patient counts (no column title); also renamed the StateCity column title to State\City
				//tab = "<table id=\"ReportTable\"><tr><th>PATIENT_ID</th><th>Vital Status</th><th>Birth Date</th><th>Sex</th><th>Age</th><th>Language</th><th>Race</th><th>Religion</th><th>Marital Status</th><th>ZipCode</th><th>StateCity</th>";
				//columnNr = 11; // column count 
				//arrayCol = { col1 : 'id_paz' , col2 : 'Vital' , col3 : 'Birth' , col4 : 'Sex' , col5 : 'Age' , col6 : 'Language' , col7 : 'Race' , col8 : 'Religion' , col9 : 'Marital' , col10 : 'ZipCode' , col11 : 'StateCity' , }; 

				///swc20120110 updated to allow more flexible selective dropping of columns
				var dropCols = i2b2.ExportXLS.dropColumns();
				//tab = "<table id=\"ReportTable\"><caption><b>Patient Information</b><br> for Patient Set <i>\'" + i2b2.ExportXLS.model.prsRecord.sdxInfo.sdxDisplayName +
                                //      "\'<br>&nbsp;</i></caption><tr><th>&nbsp;</th><th>PATIENT_ID</th><th>Vital Status</th><th>Birth Date</th>" + 
                                //      "<th>Sex</th><th>Age</th><th>Language</th><th>Race</th><th>Religion</th><th>Marital Status</th><th>Zip Code</th><th>State\\City</th>";

				///swc20120213 for i2b2 v1.6 compatibility
				//columnNr = 12; // column count 
				columnNr = 13; // column count 

				//arrayCol = { col0 : ' ', col1 : 'id_paz', col2 : 'Vital', col3 : 'Birth', col4 : 'Sex', col5 : 'Age', col6 : 'Language', col7 : 'Race', col8 : 'Religion', col9 : 'Marital', col10 : 'ZipCode', col11 : 'StateCity' };				 
				tab = "<table id=\"ReportTable\"><caption><b>Patient Information</b><br> for Patient Set <i>\'" + 
                                      i2b2.ExportXLS.model.prsRecord.sdxInfo.sdxDisplayName + "\'<br>&nbsp;</i></caption><tr><th>&nbsp;</th><th>PATIENT_ID</th>";
				arrayCol = { col0 : ' ', col1 : 'id_paz' };				
				if (-1 == dropCols.indexOf("Vital Status")) {
				   tab += "<th>Vital Status</th>";
				   arrayCol["col2"] = 'Vital';
				} 
				if (-1 == dropCols.indexOf("Birth Date")) {
				   tab += "<th>Birth Date</th>";
				   arrayCol["col3"] = 'Birth';
				} else if (-1 == dropCols.indexOf("Birth Year")) {
				   tab += "<th>Birth Year</th>";
				   arrayCol["col3"] = 'BirthYr';
				   birthyrOnly = true;				   
				} 
				if (-1 == dropCols.indexOf("Sex")) {
				   tab += "<th>Sex</th>";
				   arrayCol["col4"] = 'Sex';
				} 
				if (-1 == dropCols.indexOf("Age")) {
				   tab += "<th>Age</th>";
				   arrayCol["col5"] = 'Age';
				} 
				if (-1 == dropCols.indexOf("Language")) {
				   tab += "<th>Language</th>";
				   arrayCol["col6"] = 'Language';
				} 
				if (-1 == dropCols.indexOf("Race")) {
				   tab += "<th>Race</th>";
				   arrayCol["col7"] = 'Race';
				} 
				if (-1 == dropCols.indexOf("Religion")) {
				   tab += "<th>Religion</th>";
				   arrayCol["col8"] = 'Religion';
				} 
				if (-1 == dropCols.indexOf("Marital Status")) {
				   tab += "<th>Marital Status</th>";
				   arrayCol["col9"] = 'Marital';
				} 
				if (-1 == dropCols.indexOf("Zip Code")) {
				   tab += "<th>Zip Code</th>";
				   arrayCol["col10"] = 'ZipCode';
				} 
				if (-1 == dropCols.indexOf("State\City")) {
				   tab += "<th>State\\City</th>";
				   arrayCol["col11"] = 'StateCity';
				} 
				if (-1 == dropCols.indexOf("Income")) { ///swc20120213 for v1.6 compatibility
				   tab += "<th>Income</th>";
				   arrayCol["col12"] = 'Income';
				} 
			}
			
			else if (!i2b2.ExportXLS.model.outputOptions.patients) {
				//swc20110718 added table title (caption) as well as new first column for patient counts (no column title); also renamed the StateCity column title to State/City
				//tab = "<table id=\"ReportTable\"><tr><th>PATIENT_ID</th>";
				//columnNr = 1; // column count 
				//arrayCol = { col1 : 'id_paz' };				
				tab = "<table id=\"ReportTable\"><caption><b>Patient Information</b><br> for Patient Set <i>\'" + 
                                      i2b2.ExportXLS.model.prsRecord.sdxInfo.sdxDisplayName + "\'<br>&nbsp;</i></caption><tr><th></th><th>PATIENT_ID</th>";
				columnNr = 2; // column count 
				arrayCol = { col0 : ' ', col1 : 'id_paz' };				
			}
					
			var patientNr = 0;
			var rigaObj = {};

			///swc20120213 fixed IE missing concepts problem 
			//$j(results.msgResponse).find('ns2\\:observation_set').each(function() {
			$j(res).find('ns2\\:observation_set').each(function() {
				var panelName = $j(this).attr('panel_name');
				var columnName = "";
				
				for (var i = 0; i < i2b2.ExportXLS.model.concepts.length; i++) {
					var keyName = i2b2.ExportXLS.model.concepts[i].sdxInfo.sdxKeyValue;
					if (keyName == panelName) {
						columnName = i2b2.ExportXLS.model.concepts[i].sdxInfo.sdxDisplayName;
					}
				}
				tab = tab + "<th>" + columnName + "</th>";
				columnNr = columnNr + 1;
				var nameColArr = "col"+columnNr;
				arrayCol[nameColArr] = columnName; 
			});
			
			if (i2b2.ExportXLS.model.outputOptions.patients) {
				//swc20110718 new first column for patient (row) counts 
				//columnNr = 11; // re-initialize the variable
				///swc20120213 for i2b2 v1.6 compatibility
				//columnNr = 12; // re-initialize the variable
				columnNr = 13; // re-initialize the variable
			
				tab = tab + "</tr>";
			
				var patientId = "";
				var vitalStatus = "";
				var birthDate = "";
				var sex = "";
				var age = "";
				var language = "";
				var race = "";
				var religion = "";
				var marital = "";
				var zipcode = "";
				var state = "";
				///swc20120213 for i2b2 v1.6 compatibility
				var income = "";
				
				$j(xmlDoc).find('patient').each(function() {
					
					patientNr = patientNr + 1;
					var patientNrArr = "pat" + patientNr;
					patientId = $j(this).find('patient_id').text();
					
// civi					
cohort = cohort + patientId + ",";

					
					
					
					
					var patientObj = $j(this);
					
					patientObj.find('param').each(function() {
						var param = $j(this).text();
						
						//if ($j(this).attr('name') == "vital_status_cd") {
						if ($j(this).attr('column') == "vital_status_cd") {
							vitalStatus = param;
						}
						//swc20110718 changed all "if" to "else if" to improve performance
						//else if ($j(this).attr('name') == "birth_date") {
						else if ($j(this).attr('column') == "birth_date") {
							///swc20120210 added substitution of birthyear for birthdate
							if (birthyrOnly) {
							    birthDate = param.substring(0,4);
							} else {
							    birthDate = param.substring(0,10);
							}
						}
						//else if ($j(this).attr('name') == "sex_cd") {
						else if ($j(this).attr('column') == "sex_cd") {
							sex = param;
						}
						//else if ($j(this).attr('name') == "age_in_years_num") {
						else if ($j(this).attr('column') == "age_in_years_num") {
							age = param;
						}
						//else if ($j(this).attr('name') == "language_cd") {
						else if ($j(this).attr('column') == "language_cd") {
							language = param;
						}
						//else if ($j(this).attr('name') == "race_cd") {
						else if ($j(this).attr('column') == "race_cd") {
							race = param;
						}
						//else if ($j(this).attr('name') == "religion_cd") {
						else if ($j(this).attr('column') == "religion_cd") {
							religion = param;
						}
						//else if ($j(this).attr('name') == "marital_status_cd") {
						else if ($j(this).attr('column') == "marital_status_cd") {
							marital = param;
						}
						//else if ($j(this).attr('name') == "zipcode_char") {
						else if ($j(this).attr('column') == "zipcode_char") {
							zipcode = param;
						}
						//else if ($j(this).attr('name') == "statecityzip_path_char") {
						else if ($j(this).attr('column') == "statecityzip_path_char") {
							state = param;
						}
						///swc20120213 for i2b2 v1.6 compatibility
						else if ($j(this).attr('column') == "income_cd") {
							income = param;
						}
					});
						
					var ArrTemp = {};
				
					rigaObj[patientNrArr] = ArrTemp; // it's like rigaObj = {pat# : {id : patientId}}
					
					for (var key in arrayCol) {
						//swc20110718 added col0 (patient count)
						if (key == "col0") {
							ArrTemp[key] = patientNr;
						}
						//swc20110718 changed all "if" to "else if" to improve performance
						else if (key == "col1") {
							ArrTemp[key] = patientId;
						}
						else if (key == "col2") {
							ArrTemp[key] = vitalStatus;
						}
						else if (key == "col3") {
							ArrTemp[key] = birthDate;
						}
						else if (key == "col4") {
								ArrTemp[key] = sex;
						}
						else if (key == "col5") {
							ArrTemp[key] = age;
						}
						else if (key == "col6") {
							ArrTemp[key] = language;
						}
						else if (key == "col7") {
							ArrTemp[key] = race;
						}
						else if (key == "col8") {
							ArrTemp[key] = religion;
						}
						else if (key == "col9") {
							ArrTemp[key] = marital;
						}
						else if (key == "col10") {
							ArrTemp[key] = zipcode;
						}
						else if (key == "col11") {
							//swc20110712 removed any leading redundant "Zip codes" and trailing actual zipcode value from each state string
							//ArrTemp[key] = state;
							if ("Zip codes" == state.substring(0, 9)) {
							        ArrTemp[key] = state.substring(10, state.length);
							} else {
								ArrTemp[key] = state;
							}
							var ln = ArrTemp[key].length;
							if (ArrTemp[key].substring(ln - 6, ln - 1) == zipcode) { // i2b2 v1.6RC2 i2bedemodata sample entries are of form "sometown\zcode\"
								ArrTemp[key] = ArrTemp[key].substring(0, ln - 7);
							}
						}
						///swc20120213 for i2b2 v1.6 compatibility
						else if (key == "col12") {
							ArrTemp[key] = income;
						}

						//swc20110718 replaced next "else if" with simple "else" to improve performance
						//else if ((key != "col1") && (key != "col2") && (key != "col3") && (key != "col4") && (key != "col5") && (key != "col6") && (key != "col7") && (key != "col8") && (key != "col9") && (key != "col10") && (key != "col11")){
						else {
							ArrTemp[key] = "";
						}
					}
					vitalStatus = "";
					birthDate = "";
					sex = "";
					age = "";
			 		language = "";
					race = "";
					religion = "";
					marital = "";
					zipcode = "";
					state = "";			
					///swc20120213 for i2b2 v1.6 compatibility
					income = "";
				});
			}
			
			else if (!i2b2.ExportXLS.model.outputOptions.patients) {
				//swc20110718 added new first column for patient (row) counts 
				//columnNr = 1; // re-initialize the variable
				columnNr = 2; // re-initialize the variable
			
				tab = tab + "</tr>";
			
				///swc20120213 fixed IE missing patient_IDs problem 			
				//$j(results.msgResponse).find('patient').each(function() { 
				$j(xmlDoc).find('patient').each(function() { 
					patientNr = patientNr + 1;
					var patientNrArr = "pat" + patientNr;
					var patientId = $j(this).find('patient_id').text(); 
					var ArrTemp = {};
					
					rigaObj[patientNrArr] = ArrTemp; // it's like rigaObj = {pat# : {id : patientId}}

					for (var key in arrayCol) {
						//swc20110718 added col0 (patient count)
						if (key == "col0") {
							ArrTemp[key] = patientNr;
						}
						else if (key == "col1") {
							ArrTemp[key] = patientId;
						}
						else {
							ArrTemp[key] = "";
						}

					}
				});
			}
			
			///swc20120213 fixed IE missing concepts problem 			
			//$j(results.msgResponse).find('ns2\\:observation_set').each(function() {
			$j(res).find('ns2\\:observation_set').each(function() {
				var observationSet = $j(this);
				columnNr = columnNr + 1;
				var nameColArr = "col"+columnNr;
				var panelName = observationSet.attr('panel_name');
				var columnName = "";
				for (var i = 0; i < i2b2.ExportXLS.model.concepts.length; i++) {
					var keyName = i2b2.ExportXLS.model.concepts[i].sdxInfo.sdxKeyValue;
					if (keyName == panelName) {
						columnName = i2b2.ExportXLS.model.concepts[i].sdxInfo.sdxDisplayName;
					}
				}
				observationSet.find('observation').each(function() {	
					var patient_id = $j(this).find('patient_id').text();
					var valuetype_cd = $j(this).find('valuetype_cd').text();
					var valueObs = "";					
					if (valuetype_cd == "T") {
						valueObs = $j(this).find('tval_char').text();
						//swc20110712 added using concept_cd when tval_char value is blank
						if (0 == valueObs.length || "" == valueObs) {
						        valueObs = $j(this).find('concept_cd').text();
						}
					}
					//swc20110712 changed to use else if 
					//if (valuetype_cd == "N") {
					else if (valuetype_cd == "N") {
						valueObs = $j(this).find('nval_num').text();
					}
					//swc20110712 added defaulting to concept_cd if neither tval_char nor nval_num is available
					else {
					        valueObs = $j(this).find('concept_cd').text();
					}
					for (var key in rigaObj) {
						var patNr = rigaObj[key];
						
						for (var key2 in patNr){
							if (key2 == "col1") {
								if (patient_id == patNr[key2]) {
									if (columnName == arrayCol[nameColArr]) {
										patNr[nameColArr] = valueObs;
									}
								}
							} 
						}
					}					
				});
			});
			for (var key in rigaObj) {
				tab = tab + "<tr>";
				var patNr = rigaObj[key];				
				for (var key in patNr){
					tab = tab + "<td>" + patNr[key] + "</td>"
				}
				tab = tab + "</tr>";
			}
			tab = tab + "</table>"; 

			$$("DIV#ExportXLS-mainDiv DIV#ExportXLS-TABS DIV.results-working")[0].hide();
			$$("DIV#ExportXLS-mainDiv DIV#ExportXLS-TABS DIV.results-finished")[0].show();
			var divResults = $$("DIV#ExportXLS-mainDiv DIV#ExportXLS-InfoPDO")[0];
			Element.select(divResults, '.InfoPDO-Response .originalXML')[0].innerHTML = '<pre>'+tab+'</pre>';
			
			$$("DIV#ExportXLS-mainDiv DIV#ExportXLS-TABS DIV.results-export")[0].show();

			// optimization - only requery when the input data is changed
			i2b2.ExportXLS.model.dirtyResultsData = false;
		}
		
		$$("DIV#ExportXLS-mainDiv DIV#ExportXLS-TABS DIV.results-directions")[0].hide();
		$$("DIV#ExportXLS-mainDiv DIV#ExportXLS-TABS DIV.results-finished")[0].hide();
		$$("DIV#ExportXLS-mainDiv DIV#ExportXLS-TABS DIV.results-export")[0].hide();
		$$("DIV#ExportXLS-mainDiv DIV#ExportXLS-TABS DIV.results-working")[0].show();		
		// AJAX CALL USING THE EXISTING CRC CELL COMMUNICATOR
		i2b2.CRC.ajax.getPDO_fromInputList("Plugin:ExportXLS", {PDO_Request: msg_filter}, scopedCallback);
	}
}
