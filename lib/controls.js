function MyControls( objects, domElement ,G) {//for multi cameras
	var STATE = { NONE: - 1, ROTATE: 0, ZOOM: 1, PAN: 2, TOUCH_ROTATE: 3, TOUCH_ZOOM_PAN: 4 };

	var _this = this;
	this.objects = objects;
	this.object=objects[Object.keys(objects)[0]];
	this.position0=new THREE.Vector3();
	this.position0.copy(this.object.position);
	this.target0=new THREE.Vector3();
	this.up0=new THREE.Vector3(0,0,1);
	this.domElement = ( domElement !== undefined ) ? domElement : document;

	this.screen = { left: 0, top: 0, width: 0, height: 0 };

	this.rotateSpeed = 0.5;
	this.zoomSpeed = 1.2;
	this.panSpeed = 0.2;

	this.staticMoving = false;
	this.dynamicDampingFactor = 0.3;

	this.minDistance = 0.00001;
	this.maxDistance = Infinity;
	this.zoomIntoDistance = 80;
	this.zoomOutDistance = 25000;
	//prevent zooming attempts in too short intervals, because the server takes time to respond after a zooming and we don't ant to send the request twice

	this.lastZoomTime=0;//prevent rapid zoom-in/outs


	this.target = new THREE.Vector3();
	this.dynamicTargetObj=null;

	var EPS = 0.000001;

	var lastPosition = new THREE.Vector3();

	var _state = STATE.NONE,
	_prevState = STATE.NONE;

	this.stopMoving=function(){
		_state = STATE.NONE;
	}



	_eye = new THREE.Vector3();
	this._eye=_eye;
	_movePrev = new THREE.Vector2(),
	_moveCurr = new THREE.Vector2(),

	//_lastAxis = new THREE.Vector3(),
	//_lastAngle = 0,
	_lastAngleH=0,_lastAngleV=0,

	_zoomStart = new THREE.Vector2(),
	_zoomEnd = new THREE.Vector2(),

	_touchZoomDistanceStart = 0,
	_touchZoomDistanceEnd = 0,

	_panStart = new THREE.Vector3(),
	_panEnd = new THREE.Vector3();

	_keyPanStart = new THREE.Vector3(),
	_keyPanEnd = new THREE.Vector3();

	var _extraRotate= new THREE.Vector2();
	var _extraPan= new THREE.Vector3();
	this._extraZoom=1;

function keydown( event ) {
if ( _state !== STATE.NONE ) {return;}
else if ( event.keyCode === 16) { _state = "shift";}
else if ( event.keyCode === 17) { _state = "control";}

 if ( event.keyCode === 87 || event.keyCode === 38 ) { _keyPanEnd.y+=0.05;} //up w
 if ( event.keyCode === 83 || event.keyCode === 40 ) { _keyPanEnd.y-=0.05;} //down s
 if ( event.keyCode === 65 || event.keyCode === 37) { _keyPanEnd.x+=0.05;} //left a
 if ( event.keyCode === 68 || event.keyCode === 39) { _keyPanEnd.x-=0.05;} //right d

//else if ( event.keyCode === _this.keys[ STATE.ROTATE ]) { _state = STATE.ROTATE;}
//else if ( event.keyCode === _this.keys[ STATE.ZOOM ]) {_state = STATE.ZOOM; }
else if ( event.keyCode === 80) {_state = STATE.PAN;}

}
function keyup( event ) {
		_state =STATE.NONE;
}

function mousedown( event ) {

	if ( _state === STATE.NONE ) {_state = event.button;}

	if ( _state === STATE.ROTATE) {
		_moveCurr.copy( getMouseOnCircle( event.pageX, event.pageY ) );
		_movePrev.copy( _moveCurr );
	}
	else if ( _state === STATE.ZOOM) {
		_zoomStart.copy( getMouseOnScreen( event.pageX, event.pageY ) );
		_zoomEnd.copy( _zoomStart );
	}
	else if ( _state === STATE.PAN) {
		_panStart.copy( getMouseOnScreen( event.pageX, event.pageY ) );
		_panEnd.copy( _panStart );
	}

	document.addEventListener( 'mousemove', mousemove, false );
	document.addEventListener( 'mouseup', mouseup, false );

	//_this.dispatchEvent( startEvent );

}

function mousemove( event ) {
	if ( _state === STATE.ROTATE) {

		_movePrev.copy( _moveCurr );
		_moveCurr.copy( getMouseOnCircle( event.pageX, event.pageY ) );

	} else if ( _state === STATE.ZOOM) {

		_zoomEnd.copy( getMouseOnScreen( event.pageX, event.pageY ) );

	} else if ( _state === STATE.PAN) {

		_panEnd.copy( getMouseOnScreen( event.pageX, event.pageY ) );

	}

}

function mouseup( event ) {

	_state = STATE.NONE;

}

function mousewheel( event ) {

	event.preventDefault();
	switch ( event.deltaMode ) {

		case 2:
			// Zoom in pages
			_zoomStart.y -= event.deltaY * 0.025;
			break;

		case 1:
			// Zoom in lines
			_zoomStart.y -= event.deltaY * 0.01;
			break;

		default:
			// undefined, 0, assume pixels
			_zoomStart.y -= event.deltaY * 0.00025;
			break;

	}

}

function touchstart( event ) {

	if ( _this.enabled === false ) return;

	switch ( event.touches.length ) {

		case 1:
			_state = STATE.TOUCH_ROTATE;
			_moveCurr.copy( getMouseOnCircle( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY ) );
			_movePrev.copy( _moveCurr );
			break;

		default: // 2 or more
			_state = STATE.TOUCH_ZOOM_PAN;
			var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
			var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
			_touchZoomDistanceEnd = _touchZoomDistanceStart = Math.sqrt( dx * dx + dy * dy );

			var x = ( event.touches[ 0 ].pageX + event.touches[ 1 ].pageX ) / 2;
			var y = ( event.touches[ 0 ].pageY + event.touches[ 1 ].pageY ) / 2;
			_panStart.copy( getMouseOnScreen( x, y ) );
			_panEnd.copy( _panStart );
			break;

	}

	_this.dispatchEvent( startEvent );

}

function touchmove( event ) {

	if ( _this.enabled === false ) return;

	event.preventDefault();
	event.stopPropagation();

	switch ( event.touches.length ) {

		case 1:
			_movePrev.copy( _moveCurr );
			_moveCurr.copy( getMouseOnCircle( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY ) );
			break;

		default: // 2 or more
			var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
			var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
			_touchZoomDistanceEnd = Math.sqrt( dx * dx + dy * dy );

			var x = ( event.touches[ 0 ].pageX + event.touches[ 1 ].pageX ) / 2;
			var y = ( event.touches[ 0 ].pageY + event.touches[ 1 ].pageY ) / 2;
			_panEnd.copy( getMouseOnScreen( x, y ) );
			break;

	}

}

function touchend( event ) {

	if ( _this.enabled === false ) return;

	switch ( event.touches.length ) {

		case 0:
			_state = STATE.NONE;
			break;

		case 1:
			_state = STATE.TOUCH_ROTATE;
			_moveCurr.copy( getMouseOnCircle( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY ) );
			_movePrev.copy( _moveCurr );
			break;

	}

	_this.dispatchEvent( endEvent );

}


function contextmenu( event ) {
	event.preventDefault();

}








	this.leftVector=  new THREE.Vector3();
	this.forwardVector=  new THREE.Vector3();//
	this.screenUpVector=  new THREE.Vector3();//camera up projected onto XY plane. Useful for dragging things up on screen where forward does not correspond to on-screen upward, because forward is the "into screen" vector in the XY plane
	this.upVector= new THREE.Vector3();this.upVector.z=1;

	this.updateVectors=function (){
		//funny bug: screen left vector should be eye X camera up, not eye X world space up, or it would be on the right side for some camera angles.
		this.leftVector.copy(_eye).cross(this.object.up).normalize();
		this.forwardVector.copy(this.leftVector).cross(this.upVector).normalize();
		this.screenUpVector.copy(this.object.up);this.screenUpVector.z=0;this.screenUpVector.normalize();
	}





		this.rotateCamera = ( function() {

		var axis = new THREE.Vector3(),
			quaternion = new THREE.Quaternion(),
			eyeDirection = new THREE.Vector3(),
			objectUpDirection = new THREE.Vector3(),
			objectSidewaysDirection = new THREE.Vector3(),
			realUp = new THREE.Vector3(0,0,1),
			moveDirection = new THREE.Vector3(),
			angle,
			angleH,angleV;//do not tilt sideways; axes must look vertical

		return function rotateCamera() {

			moveDirection.set( _moveCurr.x - _movePrev.x + _extraRotate.x, _moveCurr.y - _movePrev.y +_extraRotate.y, 0 );
			_extraRotate.x=0;_extraRotate.y=0;
			if((moveDirection.x!=0)&&(moveDirection.y!=0)){
				if(Math.abs(moveDirection.x/moveDirection.y)<0.08){moveDirection.x=0;}
				else if(Math.abs(moveDirection.y/moveDirection.x)<0.08){moveDirection.y=0;}
			}
			angle = moveDirection.length();
			angleH=moveDirection.x;
			angleV=moveDirection.y;


			//when the user drags almost horizontally or vertically, snap it to the main direction
			if ( angle >0.00001) {

				_eye.copy( _this.object.position ).sub( _this.target );
				eyeDirection.copy( _eye ).normalize();
				objectUpDirection.copy( _this.object.up ).normalize();
				//objectSidewaysDirection.crossVectors( objectUpDirection, eyeDirection ).normalize();

				//objectUpDirection.setLength( _moveCurr.y - _movePrev.y );
				//objectSidewaysDirection.setLength( _moveCurr.x - _movePrev.x );

				//moveDirection.copy( objectUpDirection.add( objectSidewaysDirection ) );

				//axis.crossVectors( moveDirection, _eye ).normalize();
				quaternion.setFromAxisAngle( realUp, -angleH );
				_eye.applyQuaternion( quaternion );
				for(let name in this.objects){_this.objects[name].up.applyQuaternion( quaternion );}

				_this.target.applyQuaternion( quaternion );

				//_eye.copy( _this.object.position ).sub( _this.target );
				eyeDirection.copy( _eye ).normalize();
				objectUpDirection.copy( _this.object.up ).normalize();
				objectSidewaysDirection.crossVectors( objectUpDirection, eyeDirection ).normalize();
				quaternion.setFromAxisAngle( objectSidewaysDirection, angleV );
				_eye.applyQuaternion( quaternion );
				for(let name in this.objects){_this.objects[name].up.applyQuaternion( quaternion );}
				//_this.target.applyQuaternion( quaternion );//this is to rotate the looked at point so it feels like only the object rotates

				//angle *= _this.rotateSpeed/Math.min(Math.max(_eye.length()/200,0.2),5);//added factor depending on distance from axis, otherwise seeing things farther from the axis becomes hard
				//quaternion.setFromAxisAngle( realUp, angle );

				//_eye.applyQuaternion( quaternion );
				//_this.object.up.applyQuaternion( quaternion );

				//_lastAxis.copy( axis );
				//_lastAngle = angle;
				_lastAngleH = angleH;
				_lastAngleV = angleV;

			} else if ( ! _this.staticMoving && (Math.abs(_lastAngleH)+Math.abs(_lastAngleV)>0.00001) ) {

				//_lastAngle *= Math.sqrt( 1.0 - _this.dynamicDampingFactor );
				_lastAngleH *= Math.sqrt( 1.0 - _this.dynamicDampingFactor );
				_lastAngleV *= Math.sqrt( 1.0 - _this.dynamicDampingFactor );

				_eye.copy( _this.object.position ).sub( _this.target );
				objectUpDirection.copy( _this.object.up ).normalize();

				quaternion.setFromAxisAngle( realUp, -_lastAngleH );
				_eye.applyQuaternion( quaternion );
				for(let name in this.objects){_this.objects[name].up.applyQuaternion( quaternion );}
				_this.target.applyQuaternion( quaternion );

				objectUpDirection.copy( _this.object.up ).normalize();
				//_eye.copy( _this.object.position ).sub( _this.target );
				eyeDirection.copy( _eye ).normalize();
				objectSidewaysDirection.crossVectors( objectUpDirection, eyeDirection ).normalize();
				quaternion.setFromAxisAngle( objectSidewaysDirection, _lastAngleV );
				_eye.applyQuaternion( quaternion );
				for(let name in this.objects){_this.objects[name].up.applyQuaternion( quaternion );}
				//I want to rotate the camera vertically relative to the target point but it doesn't work as intended
				//_eye.addScaledVector(_this.target,-1);
				//_eye.applyQuaternion( quaternion );
				//_eye.add(_this.target);

				//this is to rotate the looked at point so it feels like only the object rotates
				//don't rotate the target for vertical rotation


				//quaternion.setFromAxisAngle( _lastAxis, _lastAngle );
				//_eye.applyQuaternion( quaternion );
				//_this.object.up.applyQuaternion( quaternion );

			}

			//set the vectors for outside use

			this.updateVectors();

			_movePrev.copy( _moveCurr );

		};

	}() );


	this.zoomCamera = function () {

		var factor=_this._extraZoom;

		if ( _state === STATE.TOUCH_ZOOM_PAN ) {

			factor *= _touchZoomDistanceStart / _touchZoomDistanceEnd;
			_touchZoomDistanceStart = _touchZoomDistanceEnd;
			_eye.multiplyScalar( factor );
			_this._extraZoom=1;

		} else {

			factor *= 1.0 + ( _zoomEnd.y - _zoomStart.y ) * _this.zoomSpeed;

			if ( factor !== 1.0 && factor > 0.0 ) {

				_eye.multiplyScalar( factor );

			}

			if ( _this.staticMoving ) {

				_zoomStart.copy( _zoomEnd );

				_this._extraZoom=1;

			} else {

				_zoomStart.y += ( _zoomEnd.y - _zoomStart.y ) * this.dynamicDampingFactor;
				_this._extraZoom+=(1-_this._extraZoom)*this.dynamicDampingFactor;

			}

		}

	};

	this.panCamera = ( function() {

		var mouseChange = new THREE.Vector3(),
			pan = new THREE.Vector3(),
			objectForward = new THREE.Vector3(),
			objectLeft = new THREE.Vector3(),
			objectUp = new THREE.Vector3();
			objectUp.z=1;
			mouseChange.z=0;


		return function panCamera() {

			mouseChange.copy( _panEnd ).sub( _panStart );mouseChange.z=0;
			pan.copy( _keyPanEnd ).sub( _keyPanStart ).add(_extraPan);
			_extraPan.multiplyScalar(0);
			//mouseChange.x=0;
			if ( mouseChange.lengthSq()>0.000001 || pan.lengthSq()>0.000001) {

				mouseChange.multiplyScalar( _eye.length() * _this.panSpeed );
				pan.multiplyScalar( _eye.length() * _this.panSpeed );

				//console.log("panning: key length "+pan.lengthSq()+", mouse length "+mouseChange.lengthSq());

				//pan.copy( _eye ).cross( _this.object.up ).setLength( mouseChange.x );
				//pan.add( objectUp.copy( _this.object.up ).setLength( mouseChange.y ) );

				objectUp.z=mouseChange.y;//always focus on the central axis
				_this.object.position.add( objectUp );
				for(let name in this.objects){_this.objects[name].position.add( objectUp );}
				_this.target.add( objectUp );

				objectUp.z=1;
				objectLeft.copy(_eye).cross(objectUp).normalize();
				objectLeft.multiplyScalar(pan.x);
				for(let name in this.objects){_this.objects[name].position.add( objectLeft );}
				_this.target.add( objectLeft );

				objectLeft.copy(_eye).cross(objectUp).normalize();//funny bug: if I don't reset this, when the target is on the left side, forward becomes backward
				objectForward.copy(objectLeft).cross(objectUp).normalize();
				objectForward.multiplyScalar(pan.y);
				for(let name in this.objects){_this.objects[name].position.add( objectForward );}
				_this.target.add( objectForward );



				if ( _this.staticMoving ) {

					_panStart.copy( _panEnd );
					_keyPanStart.copy( _keyPanEnd );

				} else {

					_panStart.add( mouseChange.subVectors( _panEnd, _panStart ).multiplyScalar( _this.dynamicDampingFactor ) );
					_keyPanStart.add( mouseChange.subVectors( _keyPanEnd, _keyPanStart ).multiplyScalar( _this.dynamicDampingFactor ) );

				}

				this.updateVectors();

			}

		};

	}() );
	this.handleResize=function() {

		if (domElement === document ) {

			screen.left = 0;
			screen.top = 0;
			screen.width = window.innerWidth;
			screen.height = window.innerHeight;

		} else {

			var box = domElement.getBoundingClientRect();
			// adjustments come from similar code in the jquery offset() function
			var d = domElement.ownerDocument.documentElement;
			this.screen.left = box.left + window.pageXOffset - d.clientLeft;
			this.screen.top = box.top + window.pageYOffset - d.clientTop;
			this.screen.width = box.width;
			this.screen.height = box.height;

		}

	}

		var getMouseOnScreen = ( function () {

		var vector = new THREE.Vector2();

		return function getMouseOnScreen( pageX, pageY ) {

			vector.set(
				( pageX - _this.screen.left ) / _this.screen.width,
				( pageY - _this.screen.top ) / _this.screen.height
			);

			return vector;

		};

	}() );

	var getMouseOnCircle = ( function () {

		var vector = new THREE.Vector2();

		return function getMouseOnCircle( pageX, pageY ) {

			vector.set(
				( ( pageX - _this.screen.width * 0.5 - _this.screen.left ) / ( _this.screen.width * 0.5 ) ),
				( ( _this.screen.height + 2 * ( _this.screen.top - pageY ) ) / _this.screen.width ) // screen.width intentional
			);

			return vector;

		};

	}() );



	var tempVector3=new THREE.Vector3();
	this.checkDistances = function () {

		let time=new Date().getTime(),dt=1500;
		if ( ! _this.noZoom || ! _this.noPan ) {
			let eyedist=_eye.length();let customZoomOutDist=G.zoomOutDistance?G.zoomOutDistance():0;
			if ( eyedist > Math.max(customZoomOutDist,_this.zoomOutDistance) )
			{
				if(G&&G.onZoomOut&&G.canZoomOut()){//todo: should logically ask G if it can zoom in/out.
					for(let name in this.objects){_this.objects[name].position.addVectors( _this.target, tempVector3.copy(_eye).setLength( _this.zoomOutDistance ) );}
					_zoomStart.copy( _zoomEnd );
					//prevent excessive zooming into/out of stuff, and also prevent spurious zooming calls very close to each other in time
					if((time-_this.lastZoomTime>dt)){G.onZoomOut();G.resetView();_this.lastZoomTime=time;}//G.addLog("zoomed out");

				}
			}
			if ( eyedist <  _this.zoomIntoDistance )
			{
				if(G&&G.onZoomInto&&_this.dynamicTargetObj){
					for(let name in this.objects){_this.objects[name].position.addVectors( _this.target,tempVector3.copy(_eye).setLength( _this.zoomIntoDistance ) );}
					_zoomStart.copy( _zoomEnd );//this happens first before loading graph because it may potentially overwrite te new graph's view
					if((time-_this.lastZoomTime>dt)){_this._extraZoom=1.1;let result=G.onZoomInto(_this.dynamicTargetObj);_this.lastZoomTime=time;}//G.addLog("zoomed in");//back off a little

				}

			}
			if ( eyedist > _this.maxDistance ) {
				for(let name in this.objects){_this.objects[name].position.addVectors( _this.target,tempVector3.copy(_eye).setLength( _this.maxDistance ) ) ;}
				//_this.object.position.addVectors( _this.target, _eye.setLength( _this.maxDistance ) );
				_zoomStart.copy( _zoomEnd );


			}
			if ( eyedist < _this.minDistance) {
				for(let name in this.objects){_this.objects[name].position.addVectors( _this.target,tempVector3.copy(_eye).setLength( _this.minDistance ) );}
				//_this.object.position.addVectors( _this.target, _eye.setLength( _this.minDistance ) );
				_zoomStart.copy( _zoomEnd );


			}


		}

	};
	let tempDynamicTarget=new THREE.Vector3();

	this.update = function () {
		let targetFactor=0.1;
		if(_this.dynamicTargetObj){
			tempDynamicTarget.set(_this.dynamicTargetObj.x,_this.dynamicTargetObj.y,_this.dynamicTargetObj.z);
			tempDynamicTarget.addScaledVector(_this.target,-1);
			_this.target.addScaledVector(tempDynamicTarget,targetFactor);
			for(let name in this.objects){_this.objects[name].position.addScaledVector(tempDynamicTarget,targetFactor);}
		}
		_eye.subVectors( _this.object.position, _this.target );
		_this.rotateCamera();
		_this.zoomCamera();
		_this.panCamera();

		for(let name in this.objects){
			let cam=_this.objects[name];
			cam.position.addVectors( _this.target, _eye );
			if(cam.isOrthographicCamera){let factor=(2*750)/Math.max(0.001,_eye.length());cam.left=window.innerWidth/-factor;cam.right=window.innerWidth/factor;cam.top=window.innerHeight/factor;cam.bottom=window.innerHeight/-factor;}//the number is chosen to make the two cameras' display areas roughly the same
		}
		//_this.object.position.addVectors( _this.target, _eye );
		_this.checkDistances();
		for(let name in this.objects){_this.objects[name].lookAt( _this.target );_this.objects[name].updateProjectionMatrix();}
		//_this.object.lookAt( _this.target );

		//if ( lastPosition.distanceToSquared( _this.object.position ) > EPS ) {
		//	_this.dispatchEvent( changeEvent );
		//	lastPosition.copy( _this.object.position );
		//}

	};
	this.reset = function () {
		_this.target.copy( _this.target0 );
		for(let name in this.objects){_this.objects[name].position.copy( _this.position0 );_this.objects[name].up.copy( _this.up0 );}
		//_this.object.position.copy( _this.position0 );
		//_this.object.up.copy( _this.up0 );

		_eye.subVectors( _this.object.position, _this.target );
		for(let name in this.objects){_this.objects[name].lookAt( _this.target );}
		//_this.object.lookAt( _this.target );

		//_this.dispatchEvent( changeEvent );

		lastPosition.copy( _this.object.position );

	};

	this.addRotate=function(x,y){
		_extraRotate.x+=x;
		_extraRotate.y+=y;
	}
	this.addPan=function(x,y,z){
		_extraPan.x+=x;
		_extraPan.y+=y;
		_extraPan.z+=z;
	}
	this.addZoom=function(z){
		_this._extraZoom=z;
	}
	this.setTarget=function(obj){
		_this.dynamicTargetObj=obj;
		//if(!obj){_this.target.x=0;_this.target.y=0;_this.target.z=0;}
	}
	this.getTarget=function(){return _this.dynamicTargetObj;}


	domElement.addEventListener( 'contextmenu', contextmenu, false );
	domElement.addEventListener( 'mousedown', mousedown, false );
	domElement.addEventListener( 'wheel', mousewheel, false );

	domElement.addEventListener( 'touchstart', touchstart, false );
	domElement.addEventListener( 'touchend', touchend, false );
	domElement.addEventListener( 'touchmove', touchmove, false );

	window.addEventListener( 'keydown', keydown, false );
	window.addEventListener( 'keyup', keyup, false );
	this.handleResize();
	this.update();

}












