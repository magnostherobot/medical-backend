let pmx = require('pmx').init({
	network: true,
	ports: true
});

module.export.profiler = pmx.probe();
