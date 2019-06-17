

| 版本号 |   日期    | 修订人 |
| :----: | :-------: | :----: |
|  1.0   | 2019.4.19 | 贾宝林 |



### indexedDB接口API使用说明文档

- **indexedDB API**

  - <https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API>

- **文件结构**

  - db_module/ [接口文件夹，相关工具类文件和配置文件]
    - config_user_defined/ [配置文件夹，每个db配置文件放在这个地方，配置文件名会被API自动索引]
    - dbInterface/ [接口文件夹，工具类方法和实例]

- **创建数据库**

  - 在db_module/config_user_defined/文件夹下新建db配置文件：db_[db name].js

  - 配置文件的格式如下（<u>*必须按照模板格式创建配置文件*</u>）

    ```javascript
    //带有*标记的地方，key值不可以改！！！
    exports.config = {
    *	_dbName:'userinfo',  //_dbName表示db数据库的名字
    *	_version:35, 		//_version表示当前数据库的版本，每次变更这个配置文件都要将这个版本+1
    *	_store:{		    //_store表示当前数据库的仓库(表)信息
    		store1:{			//仓库1，名字可以随意改
    *			name:'store1',   //name仓库名
    *			keyPath:'id',	 //keyPath代表主键，可以不配置主键
    *			index:[{name:'index',unique: false},{name:'sex',unique:false}] 	//配置的索引，也可以不配置，根据业务实际情况判断是否添加索引，索引可以是多个，unique代表值是否允许重复
    		},
    		store2:{
    *			name:'store2',
    *			index:[{name:'index',unique: false},{name:'sex',unique:true}]
    		},
    		
    	}
    }
    ```

- **初始化数据库**

  - 在应用的入口，调用db.initDB()方法，保证数据库的初始化完成（一般用于处理版本变更或第一次初始化），建议不要和其他数据库操作同时进行，因为数据库的创建是异步的，其创建表的方法没有提供事务，所以初始化完成的时间不确定。

    - ```javascript
      <script>
      	var {db} = require('./db_modules/dbInterface/db')
      	db.initDB()
      </script>
      ```

  - initDB方法会自动遍历config_user_defined/文件夹下所有的数据库配置文件内容，并根据每个配置文件，创建对应版本的表（仓库），并通过配置文件，自动设置主键或索引，方便后期查询和修改等操作。

- **打开数据库**

  - openDB方法是所有增删改查操作的基础，已经封装到各方法中，不需要独立调用。

- **更新数据库**

  - updateDB方法用来逐条修改或插入数据，有增改两个功能，使用的时候注意插入的数据要跟配置文件匹配，比如配置文件中这个表设置了主键key为'id',那插入的数据一定要有id这个字段，否则会报错。

    - ```javascript
      db.updateDB('userinfo','store2',{key:1,name:'lth'}).then(dbInstance=>{
          db.closeDB(dbInstance)
      }).catch(e=>{
      	console.log(`插入数据报错：${e}`)
      })
      ```

  - 注意，成功返回值为db的实例，方便后续处理，比如关闭数据库。

- **读取数据库**

  - readDB方法用来读取/遍历/根据主键或索引查找数据库数据，具体看参数说明。

    - ```javascript
      //读取所有数据
      db.readDB(IndexDB_Domain.DB_UserInfo_,'store1').then(result=>{
      	console.log('ansower:' + JSON.stringify(result.data))
      }).catch(e=>{
      	console.log(e)
      })
      ```

    - ```javascript
      //根据主键读取数据
      db.readDB(IndexDB_Domain.DB_UserInfo_,'store1',keyvalue).then(result=>{
      	console.log('ansower:' + JSON.stringify(result.data))
      }).catch(e=>{
      	console.log(e)
      })
      ```

    - ```javascript
      //根据索引读取数据
      //根据主键读取数据
      db.readDB(IndexDB_Domain.DB_UserInfo_,'store1',[indexKey,indexValue]).then(result=>{
      	console.log('ansower:' + JSON.stringify(result.data))
      }).catch(e=>{
      	console.log(e)
      })
      ```

      ​

  - 函数返回值可能是一个对象数组（整个表的遍历结果），可能是包含db实例、store实例、数据的对象。

- **根据索引批量读取数据库**

  - readDB_fromIndexOrIndexRange接口用来根据索引值（可以多个索引）和索引范围读取数据库数据

  - 支持多个索引读取

  - 支持多个索引值范围读取

    - ```javascript
      //最后参数代表查找索引sex值为w和索引index范围在3到4之间范围，索引time范围在9到12范围满足条件的所有数据
      db.readDB_fromIndexOrIndexRange('userinfo','store1',[{sex:'w'},{index:[3,4]},{time:[9,12]}]).then(result=>{
      		console.log(result.data)
      	})}

      ```

      ​

- **更新数据**

  - modifyData方法区分于updateDB，后者是逐条更新或插入数据，modifyData主要是为了操作颗粒度更小的数据，比如像修改一条数据中的某个值，可以配合readDB+modifyData使用。

    - ```javascript
      db.readDB(IndexDB_Domain.DB_UserInfo_,'store1',['name','tom']).then(result=>{
      		console.log(result.data)
      		result.data.name = 'jack'

      		modifyData(result.store,result.data).catch(e=>{
      			console.log(e)
      		})
      ```

- **删除表**

  - deleteTable方法用来删除表，除非代码动态实现需要，建议不用调用这个方法，直接去修改配置文件即可（每次版本变动会执行initDB中的onupgradeneeded事件，会根据配置删除不需要的表）。

- **删除数据库**

  - deleteDB实际应该用的不多

- **关闭数据库**

  - closeDB方法建议根据实际业务逻辑来做处理，因为数据库的操作是消耗性能的，长期不使用一定要关闭数据库。各个接口基本上都提供了返回db实例方法，请注意在合适的时候关闭数据库。

    ​

- 需要补充...

  - 目前封装的都是简单的api接口，后面根据业务复杂度继续完善。
  - 上数据库数据库加密解密需要做，否则数据库的信息在裸奔...