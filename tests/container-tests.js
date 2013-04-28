var should = require('should'),
	Container = require('../').Container;

describe('Container', function() {

	it('should resolve from constructor instead of key', function() {
		function Foo() {}

		var instance = new Foo(),
			resolved = new Container()
				.registerInstance(instance)
				.resolveSync(Foo);

		resolved.should.equal(instance);
	});

	it('should resolve from key', function() {
		function Foo() {}

		var instance = new Foo(),
			resolved = new Container()
				.registerInstance(instance)
				.resolveSync('Foo');

		resolved.should.equal(instance);
	});

	it('should allow options argument to be the key instead of an object', function() {
		function Foo() {}

		var instance = new Foo(),
			resolved = new Container()
				.registerInstance(instance, 'asdf')
				.resolveSync('asdf');

		resolved.should.equal(instance);
	});

	it('should throw if type is not registered', function() {
		(function() { new Container().resolveSync('Foo'); })
			.should
			.throwError('Nothing with key "Foo" is registered in the container');
	});

	describe('registration from instance', function() {
		it('should register and resolve instance', function() {
			function Foo() {}
			var instance = new Foo(),
				resolved = new Container()
					.registerInstance(instance)
					.resolveSync('Foo');

			resolved.should.equal(instance);
		});

		it('should register and resolve instance with specified key', function() {
			function Foo() {}
			var instance = new Foo(),
				resolved = new Container()
					.registerInstance(instance, { key: 'asdf' })
					.resolveSync('asdf');

			resolved.should.equal(instance);
		});

		it('should use lifetime', function() {
			var fetchCalled = false, storeCalled = false;
			var lifetime = {
				fetch: function() {
					fetchCalled = true;
				},
				store: function(value) {
					storeCalled = true;
					value.should.equal('foo');
				}
			};

			new Container()
				.registerInstance('foo', { key: 'foo', lifetime: lifetime })
				.resolveSync('foo');

			fetchCalled.should.equal(true, 'lifetime.fetch() should have been called');
			storeCalled.should.equal(true, 'lifetime.store() should have been called');
		});
	});

	describe('registration from factory', function() {
		it('should register and resolve factory', function() {
			var instance = {},
				resolved = new Container()
					.registerFactory(function() { return instance; }, { key: 'poopoo' })
					.resolveSync('poopoo');

			resolved.should.equal(instance);
		});

		it('should throw if key is not provided', function() {
			(function() { new Container().registerFactory(function() {}); })
				.should
				.throwError('"options.key" must be passed to registerFactory()');
		});

		it('should pass container into factory function', function() {
			var instance = {},
				resolved = new Container()
					.registerFactory(function(container) {
						should.exist(container);
						container.should.be.instanceOf(Container);
						return instance;
					}, { key: 'poopoo' })
					.resolveSync('poopoo');

			resolved.should.equal(instance);
		});

		it('should use lifetime', function() {
			var fetchCalled = false, storeCalled = false;
			var lifetime = {
				fetch: function() {
					fetchCalled = true;
				},
				store: function(value) {
					storeCalled = true;
					value.should.equal('foo');
				}
			};

			new Container()
				.registerFactory(function() { return 'foo'; }, { key: 'foo', lifetime: lifetime })
				.resolveSync('foo');

			fetchCalled.should.equal(true, 'lifetime.fetch() should have been called');
			storeCalled.should.equal(true, 'lifetime.store() should have been called');
		});
	});

	describe('registration from function definition', function() {
		it('should require specified key if named function not given', function() {
			(function() { new Container().registerType(function() {}); })
				.should
				.throwError('A resolution key must be given if a named function is not');
		});

		it('should use specified key even if named function given', function() {
			function Foo() {}
			var instance = new Container()
				.registerType(Foo, { key: 'Lolz' })
				.resolveSync('Lolz');

			instance.should.be.instanceOf(Foo);
		});

		it('should use specified key if anonymous function given', function() {
			var foo = function() {};
			var instance = new Container()
				.registerType(foo, { key: 'Lolz' })
				.resolveSync('Lolz');

			instance.should.be.instanceOf(foo);
		});

		it('should use doc comments to get parameter types', function() {
			function Bar() {}
			function Foo(/** Bar */bar) {
				this.bar = bar;
			}

			var bar = new Bar(),
				foo = new Container()
					.registerInstance(bar)
					.registerType(Foo)
					.resolveSync('Foo');

			foo.should.be.instanceOf(Foo);
			foo.bar.should.be.equal(bar);
		});

		it('should allow copious whitespace in function definition', function() {
			function Bar() {}
			function Foo(
				/** Bar */bar,
				/** Bar */bar2
			) {
				this.bar = bar;
				this.bar2 = bar2;
			}

			var bar = new Bar(),
				foo = new Container()
					.registerInstance(bar)
					.registerType(Foo)
					.resolveSync('Foo');

			foo.should.be.instanceOf(Foo);
			foo.bar.should.equal(bar);
			foo.bar2.should.equal(bar);
		});

		it('should throw if signature does not contain type info', function() {
			function Foo(bar) {
				this.bar = bar;
			}

			(function() {
				new Container().registerType(Foo);
			}).should.throwError('Unable to determine type of parameter at position 1 for type "Foo"');
		});

		it('should detect cyclic dependencies', function() {
			function Foo(/** Bar */bar) {}
			function Bar(/** Foo */foo) {}

			(function() {
				new Container().registerType(Foo).registerType(Bar);
			}).should.throwError('Cyclic dependency from Foo to Bar');
		});

		it('should use lifetime', function() {
			var fetchCalled = false, storeCalled = false;
			var lifetime = {
				fetch: function() {
					fetchCalled = true;
				},
				store: function(value) {
					storeCalled = true;
					value.should.be.instanceOf(Foo);
				}
			};

			function Foo() {}

			new Container()
				.registerType(Foo, { key: 'foo', lifetime: lifetime })
				.resolveSync('foo');

			fetchCalled.should.equal(true, 'lifetime.fetch() should have been called');
			storeCalled.should.equal(true, 'lifetime.store() should have been called');
		});
	});

	describe('injection', function() {
		it('should perform injection without resolution key', function() {
			var injection = {
				injectSync: function(instance, container) {
					instance.injected = true;
				}
			};

			function Foo() {}

			var container = new Container().registerType(Foo, { injections: [ injection ] }),
				instance = new Foo();

			container.injectSync(instance);
			instance.should.have.property('injected', true);
		});

		it('should perform injection with resolution key', function() {
			var injection = {
				injectSync: function(instance, container) {
					instance.injected = true;
				}
			};

			function Foo() {}

			var container = new Container().registerType(Foo, { key: 'asdf', injections: [ injection ] }),
				instance = new Foo();

			container.injectSync(instance, 'asdf');
			instance.should.have.property('injected', true);
		});

		it('should throw if key is not registered', function() {
			(function() {
				new Container().injectSync({}, 'asdf');
			}).should.throwError('Nothing with key "asdf" is registered in the container');
		});
	});

	describe('async', function() {
		it('should raise error if type is not registered', function() {
			new Container().resolve('Foo', function(err) {
				err.should.be.instanceOf(Error);
				err.should.have.property('message', 'Nothing with key "Foo" is registered in the container');
			});
		});

		it('should resolve type with dependencies', function(done) {
			function Foo(/** Bar */bar) { this.bar = bar; }
			function Bar() {}

			var container = new Container()
				.registerType(Foo)
				.registerType(Bar);

			container.resolve(Foo, function(err, resolved) {
				should.not.exist(err);
				resolved.should.be.instanceOf(Foo);
				resolved.should.have.property('bar');
				resolved.bar.should.be.instanceOf(Bar);
				done();
			});
		});

		it('should use lifetime when resolving type', function(done) {
			var fetchCalled = false, storeCalled = false;
			var lifetime = {
				fetch: function() {
					fetchCalled = true;
				},
				store: function(value) {
					storeCalled = true;
					value.should.be.instanceOf(Foo);
				}
			};

			function Foo() {}

			new Container()
				.registerType(Foo, { key: 'foo', lifetime: lifetime })
				.resolve('foo', function(err) {
					should.not.exist(err);
					fetchCalled.should.equal(true, 'lifetime.fetch() should have been called');
					storeCalled.should.equal(true, 'lifetime.store() should have been called');
					done();
				});
		});

		describe('registration from instance', function() {
			it('should register and resolve instance', function(done) {
				function Foo() {}

				var instance = new Foo(),
					container = new Container().registerInstance(instance);

				container.resolve(Foo, function(err, resolved) {
					should.not.exist(err);
					resolved.should.equal(instance);
					done();
				});
			});

			it('should register and resolve instance with specified key', function(done) {
				function Foo() {}

				var instance = new Foo(),
					container = new Container().registerInstance(instance, 'asdf');

				container.resolve('asdf', function(err, resolved) {
					should.not.exist(err);
					resolved.should.equal(instance);
					done();
				});
			});
		});

		it('should use lifetime when resolving instance', function(done) {
			var fetchCalled = false, storeCalled = false;
			var lifetime = {
				fetch: function() {
					fetchCalled = true;
				},
				store: function(value) {
					storeCalled = true;
					value.should.equal('foo');
				}
			};

			new Container()
				.registerInstance('foo', { key: 'foo', lifetime: lifetime })
				.resolve('foo', function(err) {
					should.not.exist(err);
					fetchCalled.should.equal(true, 'lifetime.fetch() should have been called');
					storeCalled.should.equal(true, 'lifetime.store() should have been called');
					done();
				});
		});

		describe('registration from factory', function() {
			it('should register and resolve factory', function(done) {
				var instance = {},
					container = new Container()
						.registerFactory(function(container, callback) {
							callback(null, instance);
						}, { key: 'poopoo' });

				container.resolve('poopoo', function(err, resolved) {
					should.not.exist(err);
					resolved.should.equal(instance);
					done();
				});
			});

			it('should raise error during resolution', function(done) {
				var container = new Container()
						.registerFactory(function(container, callback) {
							callback('fail');
						}, { key: 'poopoo' });

				container.resolve('poopoo', function(err, resolved) {
					err.should.equal('fail');
					should.not.exist(resolved);
					done();
				});
			});
		});

		it('should use lifetime when resolving factory', function(done) {
			var fetchCalled = false, storeCalled = false;
			var lifetime = {
				fetch: function() {
					fetchCalled = true;
				},
				store: function(value) {
					storeCalled = true;
					value.should.equal('foo');
				}
			};

			var factory = function(container, callback) {
				callback(null, 'foo');
			};
			new Container()
				.registerFactory(factory, { key: 'foo', lifetime: lifetime })
				.resolve('foo', function(err) {
					should.not.exist(err);
					fetchCalled.should.equal(true, 'lifetime.fetch() should have been called');
					storeCalled.should.equal(true, 'lifetime.store() should have been called');
					done();
				});
		});

		describe('injection', function() {
			it('should perform injection', function(done) {
				var injection = {
					inject: function(instance, container, callback) {
						instance.injected = true;
						callback();
					}
				};

				function Foo() { }

				var container = new Container().registerType(Foo, { injections: [ injection ] }),
					instance = new Foo();

				container.inject(instance, 'Foo', function(err) {
					should.not.exist(err);
					instance.should.have.property('injected', true);
					done();
				});
			});

			it('should raise error', function(done) {
				var injection = {
					inject: function(instance, container, callback) {
						callback('fail');
					}
				};

				function Foo() {}

				var container = new Container().registerType(Foo, { injections: [ injection ] }),
					instance = new Foo();

				container.inject(instance, 'Foo', function(err) {
					err.should.equal('fail');
					done();
				});
			});
		});
	});
});