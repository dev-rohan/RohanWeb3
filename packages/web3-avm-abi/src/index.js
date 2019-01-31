/*
 * Copyright (c) 2017-2018 Aion foundation.
 *
 *     This file is part of the aion network project.
 *
 *     The aion network project is free software: you can redistribute it 
 *     and/or modify it under the terms of the GNU General Public License 
 *     as published by the Free Software Foundation, either version 3 of 
 *     the License, or any later version.
 *
 *     The aion network project is distributed in the hope that it will 
 *     be useful, but WITHOUT ANY WARRANTY; without even the implied 
 *     warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  
 *     See the GNU General Public License for more details.
 *
 *     You should have received a copy of the GNU General Public License
 *     along with the aion network project source files.  
 *     If not, see <https://www.gnu.org/licenses/>.
 *
 * Contributors:
 *     Aion foundation.
 *     Marek Kotewicz <marek@parity.io>
 *     Fabian Vogelsteller <fabian@frozeman.de>
 */
var BUFFER_SIZE = 4096;

function Token(typeName, bytePattern, isModifier, hasSizeField, canBeNull, serializeRawDataInstance, readNonNullInstance)
{
	this._typeName = typeName;
	this._bytePattern = bytePattern;
	this._isModifier = isModifier;
	this._hasSizeField = hasSizeField;
	this._canBeNull = canBeNull;
	this.serializeRawDataInstance = serializeRawDataInstance;
	this.readNonNullInstance = readNonNullInstance;
}

var NAME_TO_TOKEN_MAP = new Object();
var BYTE_TO_TOKEN_MAP = new Object();
function createToken(typeName, bytePattern, isModifier, hasSizeField, canBeNull, serializeRawDataInstance, readNonNullInstance)
{
	var token = new Token(typeName, bytePattern, isModifier, hasSizeField, canBeNull, serializeRawDataInstance, readNonNullInstance);
	if (null != typeName)
	{
		NAME_TO_TOKEN_MAP[token._typeName] = token;
		BYTE_TO_TOKEN_MAP[token._bytePattern] = token;
	}
	return token;
}

var ABI_BYTE = createToken("byte", 0x01, false, false, false, function(stream, toEncode){
	stream.writeOne(toEncode);
}, function(stream, length){
	return stream.readOne();
});
var ABI_BOOLEAN = createToken("boolean", 0x02, false, false, false, function(stream, toEncode){
        stream.writeOne(toEncode ? 0x1 : 0x0);
}, function(stream, length){
	return stream.readOne();
});
// TODO:  Figure out how the char should be encoded.
var ABI_CHAR = createToken("char", 0x03, false, false, false, function(stream, toEncode){
        stream.writeTwo(toEncode);
}, function(stream, length){
	return stream.readTwo();
});
var ABI_SHORT = createToken("short", 0x04, false, false, false, function(stream, toEncode){
        stream.writeTwo(toEncode);
}, function(stream, length){
	return stream.readTwo();
});
var ABI_INT = createToken("int", 0x05, false, false, false, function(stream, toEncode){
        stream.writeFour(toEncode);
}, function(stream, length){
	return stream.readFour();
});
// We don't have a portable 64-bit integer representation and even the 53-bits of the Number are not accessible due to bitwise operators only operating on the low 32-bits so we will just treat this as a 32-bit integer and properly sign extend to the high 4 bits.
var ABI_LONG = createToken("long", 0x06, false, false, false, function(stream, toEncode){
	var high = (toEncode >= 0) ? 0x00 : 0xffffffff;
	var low = toEncode & 0xffffffff;
	ABI_INT.serializeRawDataInstance(stream, high);
	ABI_INT.serializeRawDataInstance(stream, low);
}, function(stream, length){
	var high = ABI_BYTE.readNonNullInstance(stream, 0);
	var low = ABI_BYTE.readNonNullInstance(stream, 0);
	return low;
});
var ABI_FLOAT = createToken("float", 0x07, false, false, false, function(stream, toEncode){
	var buffer = new ArrayBuffer(4);
	var view = new DataView(buffer);
	view.setFloat32(0, toEncode);
	var array = new Uint8Array(buffer, 0, 4);
	stream.writeBytes(array, 4);
}, function(stream, length){
	var buffer = new ArrayBuffer(4);
	var array = new Uint8Array(buffer, 0, 4);
	stream.readBytes(array, 4);
	var view = new DataView(buffer);
	return view.getFloat32(0, toEncode);
});
var ABI_DOUBLE = createToken("double", 0x08, false, false, false, function(stream, toEncode){
	var buffer = new ArrayBuffer(8);
	var view = new DataView(buffer);
	view.setFloat64(0, toEncode);
	var array = new Uint8Array(buffer, 0, 8);
	stream.writeBytes(array, 8);
}, function(stream, length){
	var buffer = new ArrayBuffer(8);
	var array = new Uint8Array(buffer, 0, 8);
	stream.readBytes(array, 8);
	var view = new DataView(buffer);
	return view.getFloat64(0, toEncode);
});

var ABI_ABYTE = createToken("byte[]", 0x11, false, true, true, function(stream, toEncode){
	for (i in toEncode)
	{
		ABI_BYTE.serializeRawDataInstance(stream, toEncode[i]);
	}
}, function(stream, length){
	var instance = [];
	for (var i = 0; i < length; ++i)
	{
		instance.push(ABI_BYTE.readNonNullInstance(stream, 0));
	}
	return instance;
});
var ABI_ABOOLEAN = createToken("boolean[]", 0x12, false, true, true, function(stream, toEncode){
	for (i in toEncode)
	{
		ABI_BOOLEAN.serializeRawDataInstance(stream, toEncode[i]);
	}
}, function(stream, length){
	var instance = [];
	for (var i = 0; i < length; ++i)
	{
		instance.push(ABI_BOOLEAN.readNonNullInstance(stream, 0));
	}
	return instance;
});
// TODO:  Figure out how the char should be encoded.
var ABI_ACHAR = createToken("char[]", 0x13, false, true, true, function(stream, toEncode){
	for (i in toEncode)
	{
		ABI_CHAR.serializeRawDataInstance(stream, toEncode[i]);
	}
}, function(stream, length){
	var instance = [];
	for (var i = 0; i < length; ++i)
	{
		instance.push(ABI_CHAR.readNonNullInstance(stream, 0));
	}
	return instance;
});
var ABI_ASHORT = createToken("short[]", 0x14, false, true, true, function(stream, toEncode){
	for (i in toEncode)
	{
		ABI_SHORT.serializeRawDataInstance(stream, toEncode[i]);
	}
}, function(stream, length){
	var instance = [];
	for (var i = 0; i < length; ++i)
	{
		instance.push(ABI_SHORT.readNonNullInstance(stream, 0));
	}
	return instance;
});
var ABI_AINT = createToken("int[]", 0x15, false, true, true, function(stream, toEncode){
	for (i in toEncode)
	{
		ABI_INT.serializeRawDataInstance(stream, toEncode[i]);
	}
}, function(stream, length){
	var instance = [];
	for (var i = 0; i < length; ++i)
	{
		instance.push(ABI_INT.readNonNullInstance(stream, 0));
	}
	return instance;
});
var ABI_ALONG = createToken("long[]", 0x16, false, true, true, function(stream, toEncode){
	for (i in toEncode)
	{
		ABI_LONG.serializeRawDataInstance(stream, toEncode[i]);
	}
}, function(stream, length){
	var instance = [];
	for (var i = 0; i < length; ++i)
	{
		instance.push(ABI_LONG.readNonNullInstance(stream, 0));
	}
	return instance;
});
// TODO:  Fix float/double codec.
var ABI_AFLOAT = createToken("float[]", 0x17, false, true, true, function(stream, toEncode){
	for (i in toEncode)
	{
		ABI_FLOAT.serializeRawDataInstance(stream, toEncode[i]);
	}
}, function(stream, length){
	var instance = [];
	for (var i = 0; i < length; ++i)
	{
		instance.push(ABI_FLOAT.readNonNullInstance(stream, 0));
	}
	return instance;
});
// TODO:  Fix float/double codec.
var ABI_ADOUBLE = createToken("double[]", 0x18, false, true, true, function(stream, toEncode){
	for (i in toEncode)
	{
		ABI_DOUBLE.serializeRawDataInstance(stream, toEncode[i]);
	}
}, function(stream, length){
	var instance = [];
	for (var i = 0; i < length; ++i)
	{
		instance.push(ABI_DOUBLE.readNonNullInstance(stream, 0));
	}
	return instance;
});

// TODO:  Fix this UTF-8 encoding.
var ABI_STRING = createToken("String", 0x21, false, true, true, function(stream, toEncode){
	for (i in toEncode)
	{
        	stream.writeOne(toEncode.charCodeAt(i));
	}
}, function(stream, length){
	var instance = '';
	for (var i = 0; i < length; ++i)
	{
		instance += String.fromCharCode(stream.readOne());
	}
	return instance;
});
// Note that the address is 32 bytes long and typically passed to us as a hex string.
var ABI_ADDRESS = createToken("Address", 0x22, false, false, true, function(stream, toEncode){
	var binary = hexStringToBinary(toEncode);
	stream.writeBytes(binary, 32);
}, function(stream, length){
	var buffer = new Uint8Array(32);
	stream.readBytes(buffer, 32);
	return binaryToHexString(buffer, 32);
});

var ABI_ARRAY = 0x31;
var ABI_NULL = 0x32;

function OutputStream(uint8s)
{
	this._uint8s = uint8s;
	this._index = 0;

	this.getWrittenLength = function()
	{
		return this._index;
	}

	this.writeOne = function(oneByte)
	{
		this._uint8s[this._index] = oneByte;
		this._index += 1;
	}

	this.writeTwo = function(twoBytes)
	{
		this._uint8s[this._index] = twoBytes >> 8;
		this._uint8s[this._index + 1] = twoBytes;
		this._index += 2;
	}

	this.writeFour = function(fourBytes)
	{
		this._uint8s[this._index] = fourBytes >> 24;
		this._uint8s[this._index + 1] = fourBytes >> 16;
		this._uint8s[this._index + 2] = fourBytes >> 8;
		this._uint8s[this._index + 3] = fourBytes;
		this._index += 4;
	}

	this.writeLength = function(length)
	{
		this.writeTwo(length);
	}

	this.writeBytes = function(buffer, length)
	{
		for (i = 0; i < length; ++i)
		{
			this._uint8s[this._index + i] = buffer[i];
		}
		this._index += length;
	}
}

function InputStream(uint8s)
{
	this._uint8s = uint8s;
	this._index = 0;

	this.readOne = function()
	{
		var value = this._uint8s[this._index];
		this._index += 1;
		return value;
	}

	this.readTwo = function()
	{
		var twoBytes = (this._uint8s[this._index] << 8)
				| (this._uint8s[this._index + 1]);
		this._index += 2;
		return twoBytes;
	}

	this.readFour = function()
	{
		var fourBytes = (this._uint8s[this._index] << 24)
				| (this._uint8s[this._index + 1] << 16)
				| (this._uint8s[this._index + 2] << 8)
				| (this._uint8s[this._index + 3]);
		this._index += 4;
		return fourBytes;
	}

	this.readLength = function()
	{
		return this.readTwo();
	}

	this.readBytes = function(buffer, length)
	{
		for (i = 0; i < length; ++i)
		{
			buffer[i] = this._uint8s[this._index + i];
		}
		this._index += length;
	}
}

function ArgType(typeToken, isArray)
{
	this._typeToken = typeToken;
	this._isArray = isArray;
}

function encodeData(stream, argType, toEncode)
{
	// We want to handle the case where the arg is an array differently from the other cases.
	if (argType._isArray)
	{
		// All arrays can be null.
		if (null == toEncode)
		{
			stream.writeOne(ABI_NULL);
		}

		// Encode the array and type, followed by the array length (if non-null).
		stream.writeOne(ABI_ARRAY);
		stream.writeOne(argType._typeToken._bytePattern);

		if (null != toEncode)
		{
			stream.writeLength(toEncode.length);
			var elementArgType = new ArgType(argType._typeToken, false);
			for (i in toEncode)
			{
				encodeNonArray(stream, elementArgType, toEncode[i]);
			}
		}
	}
	else
	{
		encodeNonArray(stream, argType, toEncode);
	}
}

function encodeNonArray(stream, argType, toEncode)
{
	// Handle the case where this is null.
	if (null == toEncode)
	{
		if (!argType._typeToken._canBeNull)
		{
			throw "type cannot be null";
		}
		else
		{
			stream.writeOne(ABI_NULL);
			stream.writeOne(argType._typeToken._bytePattern);
		}
	}
	else
	{
		stream.writeOne(argType._typeToken._bytePattern);
		if (argType._typeToken._hasSizeField)
		{
			stream.writeLength(toEncode.length);
		}
		argType._typeToken.serializeRawDataInstance(stream, toEncode);
	}
}

function binaryToHexString(uint8s, lengthToOutput)
{
	var toReturn = '0x';
	var writtenBytes = 0;
	for (i in uint8s)
	{
		if (i >= lengthToOutput)
		{
			break;
		}
		var oneByte = uint8s[i];
		var twoNibbles = ('0' + (oneByte & 0xFF).toString(16)).slice(-2);
		toReturn += twoNibbles;
		writtenBytes += 1;
	}
	if (0 == writtenBytes)
	{
		toReturn += '00';
	}
	return toReturn;
}

function hexStringToBinary(hexString)
{
	// Concise solution found here:  https://stackoverflow.com/questions/38987784/how-to-convert-a-hexadecimal-string-to-uint8array-and-back-in-javascript
	if (0 == hexString.indexOf('0x'))
	{
		hexString = hexString.substring(2);
	}
	if (0 != (hexString.length% 2))
	{
		hexString = '0' + hexString;
	}
	return new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
}

function encodeArgumentsToStream(stream, argumentTypes, argumentValues)
{
	for (i in argumentValues)
	{
		encodeData(stream, argumentTypes[i], argumentValues[i]);
	}
}

function ReadyCall(methodName, argumentTypes)
{
	// Save these args to instance variables so the user can inspect/change them consistently.
	this._methodName = methodName;
	this._argumentTypes = argumentTypes;

	this.encodeToHex = function()
	{
		var binary = new Uint8Array(BUFFER_SIZE);
		var stream = new OutputStream(binary);
		// The first thing we encode is the method name.
		encodeData(stream, new ArgType(ABI_STRING, false), this._methodName);
		// Now, encode the arguments.
		encodeArgumentsToStream(stream, this._argumentTypes, arguments);
		return binaryToHexString(binary, stream.getWrittenLength());
	}
}

function ReadyDeploy(jarArrayBuffer, argumentTypes)
{
	// Save these args to instance variables so the user can inspect/change them consistently.
	this._jarArrayBuffer = jarArrayBuffer;
	this._argumentTypes = argumentTypes;

	this.encodeToHex = function()
	{
		// First, encode the argument list.
		var argBinary = new Uint8Array(BUFFER_SIZE);
		var argStream = new OutputStream(argBinary);
		encodeArgumentsToStream(argStream, this._argumentTypes, arguments);

		// Now, use the size of that and the JAR to create the final CodeAndArguments data structure.
		var codeLength = jarArrayBuffer.byteLength;
		var argsLength = argStream.getWrittenLength();
		var combinedBinary = new Uint8Array(4 + codeLength + 4 + argsLength);
		var combinedStream = new OutputStream(combinedBinary);
		combinedStream.writeFour(codeLength);
		combinedStream.writeBytes(jarArrayBuffer, codeLength);
		combinedStream.writeFour(argsLength);
		combinedStream.writeBytes(argBinary, argsLength);

		// Now, we need to encode this final structure as a hex string.
		return binaryToHexString(combinedBinary, combinedStream.getWrittenLength());
	}
}

function readOneInstanceFromStream(stream)
{
	var token = stream.readOne();
	var isNull = false;
	var isArray = false;
	var type = null;

	// Check the modifiers first.
	if (ABI_NULL == token)
	{
		isNull = true;
		token = stream.readOne();
	}
	if (ABI_ARRAY == token)
	{
		isArray = true;
		token = stream.readOne();
	}
	type = BYTE_TO_TOKEN_MAP[token];

	// If this is null, we are done parsing everything encoded for this object.
	var instance = null;
	if (!isNull)
	{
		if (isArray)
		{
			instance = [];
			var length = stream.readLength();
			for (var i = 0; i < length; ++i)
			{
				var child = readOneInstanceFromStream(stream);
				instance.push(child);
			}
		}
		else
		{
			var length = 0;
			if (type._hasSizeField)
			{
				length = stream.readLength();
			}
			instance = type.readNonNullInstance(stream, length);
		}
	}
	return instance;
}

function ReadyDecode(binary)
{
	// Save this to an instance variable for inspection/change uses.
	this._binary = binary;

	this.decodeOneObject = function()
	{
		var stream = new InputStream(this._binary);
		return readOneInstanceFromStream(stream);
	}
}

function convertArgStringsToArgTypes(argList)
{
	var argTypes = [];
	for (i in argList)
	{
		var argTypeName = argList[i];
		var elt = NAME_TO_TOKEN_MAP[argTypeName];
		var addArrayFlag = false;
		if (!elt && argTypeName.endsWith('[]'))
		{
			elt = NAME_TO_TOKEN_MAP[argTypeName.substring(0, argTypeName.length - 2)];
			addArrayFlag = true;
		}
		if (!elt)
		{
			throw "Invalid type: " + argTypeName;
		}
		argTypes.push(new ArgType(elt, addArrayFlag));
	}
	return argTypes;
}

function CallBuilder(methodName)
{
	this._methodName = methodName;

	this.argTypes = function()
	{
		var argTypes = convertArgStringsToArgTypes(arguments);
		return new ReadyCall(this._methodName, argTypes);
	}
}

function DeployBuilder(jarArrayBuffer)
{
	this._jarArrayBuffer = jarArrayBuffer;

	this.initTypes = function()
	{
		var argTypes = convertArgStringsToArgTypes(arguments);
		return new ReadyDeploy(this._jarArrayBuffer, argTypes);
	}
}

function _ABI()
{
	this.method = function(name)
	{
		return new CallBuilder(name);
	}
	this.deployJar = function(jarArrayBuffer)
	{
		return new DeployBuilder(jarArrayBuffer);
	}
	this.decodeOneObjectFromHex = function(hexDataRendering)
	{
		var binary = hexStringToBinary(hexDataRendering);
		var dataDecoder = new ReadyDecode(binary);
		return dataDecoder.decodeOneObject();
	}

	this.TYPES =
	{
		BYTE : "byte",
		BOOLEAN : "boolean",
		CHAR : "char",
		SHORT : "short",
		INT : "int",
		LONG : "long",
		FLOAT : "float",
		DOUBLE : "double",
		STRING : "String",
		ADDRESS : "Address",

		BYTE_A : "byte[]",
		BOOLEAN_A : "boolean[]",
		CHAR_A : "char[]",
		SHORT_A : "short[]",
		INT_A : "int[]",
		LONG_A : "long[]",
		FLOAT_A : "float[]",
		DOUBLE_A : "double[]",
		STRING_A : "String[]",
		ADDRESS_A : "Address[]",

		BYTE_2A : "byte[][]",
		BOOLEAN_2A : "boolean[][]",
		CHAR_2A : "char[][]",
		SHORT_2A : "short[][]",
		INT_2A : "int[][]",
		LONG_2A : "long[][]",
		FLOAT_2A : "float[][]",
		DOUBLE_2A : "double[][]",
	};
}

var AvmAbi = new _ABI();

module.exports = AvmAbi;
