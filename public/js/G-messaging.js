G.addModule("messaging",{
	datasetID:null,
	socket:null,
	init:function(){
		let socket = io.connect("/", {  transports: [ "websocket","flashsocket","polling" ] });
		this.socket=socket;
		socket.on("test",function(data){console.log(data);});
		socket.on("connect", function(data) {
			G.clientID=socket.id;
			console.log("Connected to server");
		});
		socket.on("disconnect", function(data) {
			console.log("Disconnected from server");
		});
		socket.on("warning",function(data){
			G.addLog(data);
		});
		socket.on("stream",function(data){
			G.showStreamingData(data);
			//console.log(data);
		});
		socket.on("stream finish",function(data){G.onStreamingFinished(data)});
		
		socket.on("custom",function(data){G.messaging.onCustomData(data)})
	},
	/*
	loadGraph:function streamingUpdate(d){
		this.datasetID=d.id;
	},
	*/
	startStreaming:function (filename,options){
		this.socket.emit("start streaming",{datasetID:this.datasetID,filetype:filename,options:options});
	},
	sendCustomData:function(type,data){
		this.socket.emit(type,data);
	},
	customRequestHandlers:{},
	requestCustomData:function(type,obj,cb){
		if((!cb)&&(typeof options=="function")){cb=options;options=null;}
		if(!this.customRequestHandlers[type]){this.customRequestHandlers[type]=[];}
		this.customRequestHandlers[type].push(cb);
		obj.type=type;//may send both or either of dataPath and data
		this.socket.emit("compute",obj);
		
	},
	//custom requests should come with a handler, instead of putting the handler here. and when the response comes, we assign it to the first appropriate handler(by type and graph id etc). Should handlers with a graph id different from the current one be removed?
	
	
	onCustomData:function(data){
		if((!data)||(!data.type)){G.addLog("unknown custom data");return;}
		if(!this.customRequestHandlers[data.type]){G.addLog("unexpected custom data");return;}
		let cb=this.customRequestHandlers[data.type].shift();
		if(data&&(data.success!=false)){
			if(cb){cb(data.result);}
		}
		else{
			G.addLog("on-demand computation "+data.type+" failed");
		}
	},
	
});

function serverTest(str){
	G.messaging.socket.emit("lolcat",JSON.stringify(str));
}
