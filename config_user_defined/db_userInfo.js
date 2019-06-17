//注意每次修改下面配置，版本号+1
exports.config = {
	_dbName:'userinfo',
	_version:36,
	_store:{
		store1:{
			name:'store1',
			keyPath:'id',
			index:[{name:'index',unique: false},{name:'sex',unique:false},{name:'time',unique:false}]
		},
		store2:{
			name:'store2',
			index:[{name:'index',unique: false},{name:'sex',unique:false},{name:'time',unique:false}]
		},
		
	}
}