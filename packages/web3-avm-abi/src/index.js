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
 
/*var _ = require('underscore');
var utils = require('aion-web3-utils');
var isBN = utils.isBN;
var aionLib = require('aion-lib');
var removeLeadingZeroX = aionLib.formats.removeLeadingZeroX;*/


var BUFFER_SIZE = 4096;

function Token(typeName, bytePattern, isModifier, hasSizeField, canBeNull, serializeRawDataInstance)
{
	this._typeName = typeName;
	this._bytePattern = bytePattern;
	this._isModifier = isModifier;
	this._hasSizeField = hasSizeField;
	this._canBeNull = canBeNull;
	this.serializeRawDataInstance = serializeRawDataInstance;
}

var NAME_TO_TOKEN_MAP = new Object();
function createToken(typeName, bytePattern, isModifier, hasSizeField, canBeNull, serializeRawDataInstance)
{
	var token = new Token(typeName, bytePattern, isModifier, hasSizeField, canBeNull, serializeRawDataInstance);
	if (null != typeName)
	{
		NAME_TO_TOKEN_MAP[token._typeName] = token;
	}
	return token;
}

var ABI_BYTE = createToken("byte", 0x01, false, false, false, function(stream, toEncode){
	stream.writeOne(toEncode);
});
var ABI_BOOLEAN = createToken("boolean", 0x02, false, false, false, function(stream, toEncode){
        stream.writeOne(toEncode ? 0x1 : 0x0);
});
var ABI_CHAR = createToken("char", 0x03, false, false, false, function(stream, toEncode){
        stream.writeTwo(toEncode);
});
var ABI_SHORT = createToken("short", 0x04, false, false, false, function(stream, toEncode){
        stream.writeTwo(toEncode);
});
var ABI_INT = createToken("int", 0x05, false, false, false, function(stream, toEncode){
        stream.writeFour(toEncode);
});
var ABI_LONG = createToken("long", 0x06, false, false, false, function(stream, toEncode){
        stream.writeEight(toEncode);
});
var ABI_FLOAT = createToken("float", 0x07, false, false, false, function(stream, toEncode){
        stream.writeFour(toEncode);
});
var ABI_DOUBLE = createToken("double", 0x08, false, false, false, function(stream, toEncode){
        stream.writeEight(toEncode);
});

var ABI_ABYTE = createToken("byte[]", 0x11, false, true, true, function(stream, toEncode){
	for (i in toEncode)
	{
        	stream.writeOne(toEncode[i]);
	}
});
var ABI_ABOOLEAN = createToken("boolean[]", 0x12, false, true, true, function(stream, toEncode){
	for (i in toEncode)
	{
        	stream.writeOne(toEncode[i]);
	}
});
var ABI_ACHAR = createToken("char[]", 0x13, false, true, true, function(stream, toEncode){
	for (i in toEncode)
	{
        	stream.writeTwo(toEncode[i]);
	}
});
var ABI_ASHORT = createToken("short[]", 0x14, false, true, true, function(stream, toEncode){
	for (i in toEncode)
	{
        	stream.writeTwo(toEncode[i]);
	}
});
var ABI_AINT = createToken("int[]", 0x15, false, true, true, function(stream, toEncode){
	for (i in toEncode)
	{
        	stream.writeFour(toEncode[i]);
	}
});
var ABI_ALONG = createToken("long[]", 0x16, false, true, true, function(stream, toEncode){
	for (i in toEncode)
	{
        	stream.writeEight(toEncode[i]);
	}
});
var ABI_AFLOAT = createToken("float[]", 0x17, false, true, true, function(stream, toEncode){
	for (i in toEncode)
	{
        	stream.writeFour(toEncode[i]);
	}
});
var ABI_ADOUBLE = createToken("double[]", 0x18, false, true, true, function(stream, toEncode){
	for (i in toEncode)
	{
        	stream.writeEight(toEncode[i]);
	}
});

var ABI_STRING = createToken("String", 0x21, false, true, true, function(stream, toEncode){
	for (i in toEncode)
	{
        	stream.writeOne(toEncode.charCodeAt(i));
	}
});
var ABI_ADDRESS = createToken("Address", 0x22, false, false, true, function(stream, toEncode){
	for (i in toEncode)
	{
        	stream.writeOne(toEncode[i]);
	}
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

function ReadyCall(methodName, argumentTypes)
{
	this.encodeToHex = function()
	{
		var binary = new Uint8Array(BUFFER_SIZE);
		var stream = new OutputStream(binary);
		// The first thing we encode is the method name.
		encodeData(stream, new ArgType(ABI_STRING, false), methodName);
		// Now, encode the arguments.
		for (i in arguments)
		{
			encodeData(stream, argumentTypes[i], arguments[i]);
		}
		return binaryToHexString(binary, stream.getWrittenLength());
	}
}

function CallBuilder(methodName)
{
	this._methodName = methodName;

	this.argTypes = function()
	{
		var argTypes = [];
		for (i in arguments)
		{
			var argTypeName = arguments[i];
			console.log("ARG: " + i + "   " + argTypeName);
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
		return new ReadyCall(this._methodName, argTypes);
	}
}

function _ABI()
{
	this.method = function(name)
	{
		return new CallBuilder(name);
	}
}
var AvmAbi = new _ABI();

module.exports = AvmAbi;
