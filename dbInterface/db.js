"use strict"

var debug = true

/*
* ***************************************************************************************************************************
* indexedDB 接口
* 初始化数据库：initDB 	[此方法建议在应用启动的时候调用，不要与其他数据库操作一起调用，因为读取配置和插入表操作是耗时的]
* 打开数据库：openDB 		[此方法是数据库增删改查的必要方法，无需单独调用]
* 更新数据库：updateDB 	[此方法是单条数据（table）的插入和修改，如果想修改table内部数据，请配合readDB+modifyData使用]
* 读取数据库：readDB 		[此方法支持批量遍历数据库，通过主键和索引查找数据库数据，具体使用看参数说明和实例（example.js）]
* 更新数据：modifyData 	[此方法用于更新某个table中的数据，使用较频繁，需要配合readDB先定位到制定table使用]
* 删除表：deleteTable 	[此方法用于删除表]
* 删除数据库：deleteDB 	[此方法用于删除数据库]
* 关闭数据库：closeDB 	[此方法根据业务需求，当批量事务请求结束后，建议调用]
* 
* 接口说明请看readMe
* 接口实例请看example.js
* ***************************************************************************************************************************
*/

//配置文件名
var indexedDBConfigRouter = []
//配置文件相对路径
var configUserDefinedRelativePath = '../config_user_defined'

exports.db = {
	that:this,
	//兼容性indexedDB实例
	indexedDB:
    	window.indexedDB ||
    	window.webkitindexedDB ||
    	window.msIndexedDB ||
    	window.mozIndexedDB,

    //初始化配置文件，将配置文件夹下的配置文件路由读取
    initConfig: function(){
    	var fs = require('fs')
    	fs.readdir(__dirname+'/'+configUserDefinedRelativePath,function(err,files){
    		if(!err) 
    			indexedDBConfigRouter = [...files]
    	})
    }(),

    //读取db配置
    readDBConfig: function(dbName){
    	for(var path in indexedDBConfigRouter){
    		//读取配置
			let {config} = require(configUserDefinedRelativePath + '/' + indexedDBConfigRouter[path])
			if(config._dbName === dbName){
				return config 
			}
    	}
    	return null 
    },

    //加密
    encrycodeData:function(data){
		return debug ? data : Buffer.from(encodeURI(JSON.stringify(data))).toString('base64');
	},

	//解密
	decodeData:function(data){
		return debug ? data :JSON.parse(decodeURI(Buffer.from(data, 'base64').toString()))
	},

	//数据拆分
	splitData:function(params,data){
		if(debug) return data
		var assignData = {}
		params.forEach(function(item){
			if(data[item] !== undefined){
				assignData = Object.assign(assignData,{[item]:data[item]})
				delete data[item]
			}
		})
		return Object.assign(assignData,{data:this.encrycodeData(data)})
	},

	//数据组装
	packageData:function(dt){
		if(debug) return dt
		//如果不存在data数据，直接解密
		if(dt.data === undefined){
			return this.decodeData(dt)
		}else{
			//将data数据解密
			var assignData = this.decodeData(dt.data)
			delete dt.data
			return Object.assign(assignData,dt)
		}
	},

    /*
	* **************************************************
	* 初始化所有数据库，这个操作在系统启动之后马上进行
	* 如果更改了任何数据库配置文件，请重启应用或重新初始化数据库
	* 数据库更新等操作不应在初始化数据库后立即执行，要有时间间隔
	* **************************************************
	*/
    initDB: function(){
		try{
			//遍历数据库配置
			for(var path in indexedDBConfigRouter){
				//读取配置
				let {config} = require(configUserDefinedRelativePath + '/' + indexedDBConfigRouter[path])
				//打开数据库
				let IDBOpenDBRequest = indexedDB.open(config._dbName,config._version)

				let db 
				//当数据库版本发生变化的时候访问低版本数据库发生错误/其他原因数据库打开错误
				IDBOpenDBRequest.onerror = function(event){
					throw `数据库打开失败： db名=>${config._dbName} 错误信息=> ${event.target.error}`
				}
				//数据库打开成功，返回db对象
				IDBOpenDBRequest.onsuccess = function(event){
					db = event.target.result
					//关闭数据库
					closeDB(db)
				}
				//数据库版本发生变化，会重新创建新版本数据库，返回新的db对象
				IDBOpenDBRequest.onupgradeneeded = function(event) {
					db = event.target.result
					//根据配置创建表
					for(var i in config._store){
						//判断表格是否存在
						if(!db.objectStoreNames.contains(config._store[i].name)){
							//根据配置中是否有keyPath判断主键类型
							try{
								//创建表（仓库）
								var store = db.createObjectStore(config._store[i].name,config._store[i].keyPath? {keyPath:config._store[i].keyPath}:{autoIncrement: true});
								//创建索引
								for(let k = 0; k < config._store[i].index.length; k++){
									var index = config._store[i].index[k]
									//创建索引
									store.createIndex(index.name,index.name,{unique: index.unique}) 
								}
							}catch(e){
								alert(`创建表失败: ${config._store[i].nam},请查看配置 错误信息=>${e}`)
							}
							
						}
					}
					//如果配置中删除了部分表，重新初始化db无法删除老的数据库数据，为了保证数据库与配置文件统一，这边要做删除多余表操作
					//读取配置文件中的表信息
					let storeList = []
					for(var l in config._store){
						storeList.push(config._store[l].name)
					}
					//当前数据库表信息
					let dbNames = Array.prototype.slice.call(db.objectStoreNames)
		
					//删除表
					for(var s in dbNames){
						//查看已经存在的db是否存在没有配置的情况
						if(!storeList.includes(dbNames[s])){
							//如果配置中删除了表，这边统一删除
							try{
								db.deleteObjectStore(dbNames[s]);
							}catch(e){
								alert(`删除表失败 表名=> ${dbNames[s]} error =>${e}`)
							}
							
						}
					}
				}

			}
		}catch(e){
			alert(`数据库初始化失败,请查看配置：错误信息=>${e}`)
		}
	},

	/*
	* *************************************************************************
	* 打开数据库
	* 所有的数据库操作：更新、删除和查询都必须打开数据库
	* 请在所有事务处理完之后关闭数据库【根据业务逻辑自行选择关闭数据库时间，这边不进行封装】
	* *************************************************************************
	* @dbName  数据库名
	*/
	openDB: function(dbName){
		//找到对应的数据库配置文件
		return new Promise((resolve,reject)=>{
			let config = this.readDBConfig(dbName)
			if(!config) reject(`数据库不存在：=> ${dbName}`)
			let IDBOpenDBRequest = indexedDB.open(config._dbName,config._version)
			//当数据库版本发生变化的时候访问低版本数据库发生错误/其他原因数据库打开错误
			IDBOpenDBRequest.onerror = function(event){
				reject(`数据库打开错误：db名=>${config._dbName} 错误信息=>${event.target.error} `)
			}
			//数据库打开成功，返回db对象
			IDBOpenDBRequest.onsuccess = function(event){
				resolve(event.target.result)
			}

			//当数据库版本发生变化，但是数据库未关闭的时候触发
			IDBOpenDBRequest.onblocked = function(event){
				reject(`数据库未关闭：db名=>${config._dbName} 错误信息=> ${event.target.error}`)
			}
		})
	},

	//更新数据
	/*
	* *****************************************************
	* 单条表更新数据库，如果数据的主键或者索引不存在，相当于插入数据
	* *****************************************************
	* @dbName 	数据库名
	* @table  	数据库表名字
	* @data   	数据[必须是对象类型，设置主键的表，主要格式正确]
	* @keyPath 	主键[自增表可以传入要修改的索引（也可以不传，自增表默认会插入），设置主键的表不需要传入这个参数]
	*/
	updateDB: function(dbName,table,data,keyPath){
		return new Promise((resolve,reject)=>{
			//打开数据库
			this.openDB(dbName).then(db=>{
				try{
					//获取配置信息
					var config = this.readDBConfig(dbName)
					//主键对象
					var assignData
					var assignArr = []
					
					//查找表,将包含主键和索引的数据进行处理：把主键隔离，对数据进行加密保存
					for(var i in config._store){
						//查找到包含主键的数据
						if(config._store[i].name === table){
							if(config._store[i].keyPath !== undefined){
								assignArr.push(config._store[i].keyPath)
							}

							//查找索引数据
							for(var j in config._store[i].index){
								assignArr.push(config._store[i].index[j].name)
							}
						}else break
					}
					if(assignArr.length > 0){
						//合并数据
						assignData = this.splitData(assignArr,data)
					}

					//如果数据不包含主键，直接对数据进行保存
					var encryData = (assignData === undefined || keyPath !== undefined) ? this.encrycodeData(data):assignData

					//获取已经打开数据库的读写表实例
					let request = db.transaction(table,'readwrite')
					.objectStore(table)
					.put(encryData,keyPath)

					//更新失败
					request.onerror = function(event){
						reject(`更新/插入数据失败 db名=>${dbName} 表名=>${table} 错误信息=> ${event.target.error}`)
					}

					//更新成功
					request.onsuccess = function(event){
						//返回db，方便用户关闭等操作
						resolve(db)
					}
				}catch(e){
					reject(`更新/插入数据失败 db名=>${dbName} 表名=>${table} 错误信息=> ${e}`)
				}

			}).catch(e=>{
				reject(e)
			})
		})
	},


	/* ******************************
	* 支持主键查询
	* 支持遍历所有数据
	* 支持批量索引查找
	* 支持索引范围查找
	* *******************************
	* @dbName 数据库名
	* @table 表名
	* @params 查询参数：
	* 1、参数为空-查询所有数据  2、参数为值-主键查询数据  3、参数为数组-支持索引批量查询和索引范围查询 [{索引1：索引值},{索引2：[索引范围]}] 例如：[{index:2},{sex:3},{time:[1,3]}]
	*/
	readDB: function(dbName,table,params){
		return new Promise((resolve,reject)=>{
			var that = this
			//打开数据库
			this.openDB(dbName).then(db=>{
				try{
					//读取表
					var transaction = db.transaction(table,'readwrite')
					var store = transaction.objectStore(table)
					var request
					var indexData = []

					//判断参数，如果是非数组，代表主键查询，如果参数为空代表遍历
					if(params === undefined){
						//遍历数据
						//遍历所有数据
						store.openCursor().onsuccess = function (event) {
					    	var cursor = event.target.result;
					    	if (cursor) {
					    		//将数据放入数组
					    		indexData.push(that.packageData(cursor.value))
					       		cursor.continue();
					    	}else {
					    		//数据导出
					      		resolve({db:db,store:store,data:indexData})
					    	}
					  	}
					}else if(params instanceof Array){
						//根据索引查询
						//取第一个索引值
						var indexInstance = store.index(Object.keys(params[0]))

						//遍历
						indexInstance.openCursor().onsuccess = function(event) {
							var cursor = event.target.result;
							//数据解密
							if(cursor){
								//查找匹配索引的结果
								//匹配范围
								var m = true
								for(var i in params){
									//判断是否匹配
									var k = Object.keys(params[i])[0]
									var v = params[i][Object.keys(params[i])[0]]
									if(v === undefined) continue
									if((v instanceof Array) && v.length > 1){
										//索引是个范围
										if(cursor.value[k] < v[0] || cursor.value[k] > v[1]){
											m = false
										}
									}else{
										//索引是个具体数值
										if(cursor.value[k] != v){
											m = false
										}
									}
								}
								//匹配成功
								if(m){
									indexData.push(that.packageData(cursor.value))
								}
								cursor.continue()
							}else{
								//遍历结束
								resolve({db:db,store:store,data:indexData})
							}
							
						}
						indexInstance.openCursor().onerror = function(event) {
							reject(`未查询到符合条件的数据记录：db名=> ${dbName} 表名=>${table}`)
						}
					}else{
						//主键查询
						request = store.get(params)
						//通过指针遍历所有满足索引的数据
						if(request !== undefined){
							request.onerror = function(event){
								reject(`查询数据库失败：db名=> ${dbName} 表名=>${table} 错误信息=> ${event.target.error}`)
							}

							request.onsuccess = function(event){
								//返回db和结果
								if(request.result) resolve({db:db,store:store,data:that.packageData(request.result)})
								else reject(`未查询到数据记录：db名=> ${dbName} 表名=>${table}`)
							}
						}else reject(`未查询到数据记录：db名=> ${dbName} 表名=>${table}`)
					}
				}catch(e){
					reject(`未查询到符合条件的数据记录：db名=> ${dbName} 表名=>${table} 错误信息=> ${e}`)
				}
			})
		})
	},

	/*
	* ************************************************************************
	* 更新数据
	* 实际业务中可能频繁需要修改表数据，而且颗粒度会很小，而且都是配合读取数据库方法使用的
	* 为了方便处理这方面的业务，提供简单的修改数据接口，配置readDB使用，方便更新表数据
	* ************************************************************************
	* @storeInstance 表的实例
	* @data 要修改的数据
	*/
	modifyData: function(storeInstance,data){
		return new Promise((resolve,reject)=>{
			try{
				var request = storeInstance.put(data)
				//更新失败
				request.onerror = function(event){
					reject(`更新/插入数据失败 => ${event.target.error}`)
				}

				//更新成功
				request.onsuccess = function(event){
					//返回db，方便用户关闭等操作
					resolve(true)
				}
			}catch(e){
				//修改数据异常
				reject(e)

			}
		})
	},

	/*
	* ********************************************************************************
	* 删除表数据
	* 支持根据主键值删除表数据
	* 支持根据主键值范围删除表数据
	* 支持删除整个表数据
	* ********************************************************************************
	* @storeInstance 数据库名
	* @params 可以是主键值（根据主键删除），可以是范围数组（根据主键范围删除），可以不传（所有数据删除）
	* 例:db.deleteData(store,1)  db.deleteData(store,[1,3])  db.deleteData(store)
	*/
	deleteData: function(storeInstance,params){
		var keyRangeValue
		if(params !== undefined && params instanceof Array){
			var keyRangeValue = window.IDBKeyRange.bound(...params);
		}
	
		return new Promise((resolve,reject)=>{
			//如果没有设置主键，清理整个表
			if(params === undefined){
				storeInstance.clear()
				resolve(true)
			}else{
				var objectStoreRequest = storeInstance.delete(keyRangeValue === undefined ? params:keyRangeValue);

		  		objectStoreRequest.onsuccess = function(event) {
		    		resolve(true)
		  		};

		  		objectStoreRequest.onerror = function(event) {
		    		reject(`删除数据失败：=> ${event.target.error}`)
		  		};
			}
		})
	},

	/*
	* ********************************************************************************
	* 删除表
	* 删除表涉及到版本变动，需要重新更新版本，同时在versionChange中处理删除操作
	* 删除表有两种操作，第一种手动修改db的配置文件，版本号增加，同时删除响应的store
	* 第二种方式通过编码的形式，强制修改版本，因为后面都是从配置文件中读取的，所以配置文件也需要删改
	* ********************************************************************************
	* @dbName 数据库名
	* @table 表名
	*/
	deleteTable: function(dbName,table){
		return new Promise((resolve,reject)=>{
			//打开数据库
			this.openDB(dbName).then(db=>{
				try{
					if(db.objectStoreNames.contains(table)){
						db.deleteObjectStore(table);
						//返回db
						resolve(db)
					}
				}catch(e){
					reject(`读取数据库失败：db名=> ${dbName} 表名=>${table} 错误信息=> ${e}`)
				}
			})
		})
	},

	/*
	* ******************************************
	* 删除数据库
	* 配置文件也删除，否则下次initDB会重新创建空数据库
	* ******************************************
	* @dbNameRouter  数据库路由
	*/
	deleteDB: function(dbName){
		return new Promise((resolve,reject)=>{
			var DBDeleteRequest = indexedDB.deleteDatabase(dbName);

			DBDeleteRequest.onerror = function (event) {
	  			reject('数据库删除失败:' + dbName)
			};

			DBDeleteRequest.onsuccess = function (event) {
	  			resolve('数据库删除成功')
			};
		})
	},

	/*
	* ***************************************************************************************
	* 关闭数据库、原则每次实务结束关闭数据库，但是如果频繁关闭和打开数据库有性能开销，根据实际情况调用此接口
	* ***************************************************************************************
	*/
	closeDB: function(dbObject){
		if(dbObject) dbObject.close()
	},

}