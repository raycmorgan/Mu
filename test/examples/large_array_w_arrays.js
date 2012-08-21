(function () {
	var foo = [];
	var bar;

	for (var i = 0; i < 50; i++) {
		bar = [];

		for (var j = 0; j < 50; j++) {
			bar.push({ value: j });
		}

		foo.push({ bar: bar });
	}

	return { foo: foo };
}())
