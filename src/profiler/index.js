let pmx = require('pmx').init({
	network: true,
	ports: true
});

module.exports = { profiler: pmx.probe(), remote: pmx.action };
