(function () {
	var obj = {};
	var arr;

	for (var i = 0; i < 40; i++) {
		arr = [];

		for (var j = 0; j < 90; j++) {
			arr.push({ value: j });
		}

		obj['obj' + i] = { arr: arr };
	}

	return obj;
}())
