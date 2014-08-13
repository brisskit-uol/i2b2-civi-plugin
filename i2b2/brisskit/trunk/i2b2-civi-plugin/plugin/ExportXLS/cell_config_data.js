//-----------------------------------------------------------------------------------------------------------------------
// 2011-07-20 S.Wayne Chan [UMMS] updated category from "test" to "standard", & updated description
//-----------------------------------------------------------------------------------------------------------------------
// this file contains a list of all files that need to be loaded dynamically for this i2b2 Cell
// every file in this list will be loaded after the cell's Init function is called
{
	files:[
		"ExportXLS_ctrlr.js"
	],
	css:[ 
		"vwExportXLS.css"
	],
	config: {
		// additional configuration variables that are set by the system
		short_name: "ExportXLS",
		name: "ExportXLS", 
		description: "This plugin tabulates unidentified patient data, and applicable diagnoses from specified concepts, of a Patient Set; as well as provides convenient exportation of these data to an Excel spreadsheet.",
		category: ["celless","plugin","standard"],
		plugin: {
			isolateHtml: false,  // this means do not use an IFRAME
			isolateComm: false,  // this means to expect the plugin to use AJAX communications provided by the framework
			standardTabs: true, // this means the plugin uses standard tabs at top
			html: {
				source: 'injected_screens.html',
				mainDivId: 'ExportXLS-mainDiv'
			}
		}
	}
}
