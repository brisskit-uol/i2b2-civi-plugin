<?php
header("Content-type: application/vnd.ms-excel; name='excel'");
//updated [S. Wayne Chan, Biomedical Research Informatics Development Group, HIIS Div., QHS Dept., Univversity of Massachusetts Medical School]
//swc20110705 replaced hard-coded filename with one that incorporates a caller-specifiable keyword as well as date-time stamp for uniqueness
//header("Content-Disposition: filename=i2b2export.xls");
$filename = "i2b2data_".$_GET['ext']."_".date('Ymd-His').".xls";
header("Content-Disposition: filename=\"$filename\"");
//}
// Fix for crappy IE bug in download.
header("Pragma: ");
header("Cache-Control: ");
?>
<html>
<head></head>
<body><?=$_REQUEST['datatodisplay']?>
</body>
</html>
