/*
	JSON-to-Go
	by Matt Holt

	https://github.com/mholt/json-to-go

	A simple utility to translate JSON into a Go type definition.
*/

function jsonToGo(json, typename)
{
	var data;
	var scope;
	var go = "";
	var tabs = 0;

	try
	{
		data = JSON.parse(json.replace(/\.0/g, ".1")); // hack that forces floats to stay as floats
		scope = data;
	}
	catch (e)
	{
		return {
			go: "",
			error: e.message
		};
	}

	typename = format(typename || "AutoGenerated");
	append("type "+typename+" ");

	parseScope(scope);
	
	return { go: go };



	function parseScope(scope)
	{
		if (typeof scope === "object" && scope !== null)
		{
			if (Array.isArray(scope))
			{
				var sliceType;
				for (var i = 0; i < scope.length; i++)
				{
					var thisType = goType(scope[i]);
					if (!sliceType)
						sliceType = thisType;
					else if (sliceType != thisType)
					{
						sliceType = mostSpecificPossibleGoType(thisType, sliceType);
						if (sliceType == "interface{}")
							break;
					}
				}
				append("[]");
				if (sliceType == "struct")
					parseScope(scope[0]);
				else
					append(sliceType || "interface{}");
			}
			else
			{
				append("struct {\n");
				++tabs;
				var keys = Object.keys(scope);
				for (var i in keys)
				{
					var keyname = keys[i];
					indent(tabs);
					append(format(keyname)+" ");
					parseScope(scope[keyname]);
					append(' `json:"'+keyname+'"`\n');
				}
				indent(--tabs);
				append("}");
			}
		}
		else
			append(goType(scope));
	}

	function indent(tabs)
	{
		for (var i = 0; i < tabs; i++)
			go += '\t';
	}

	function append(str)
	{
		go += str;
	}

	// Sanitizes and formats a string to make an appropriate identifier in Go
	function format(str)
	{
		if (!str)
			return "";
		else if (str.match(/^\d+$/))
			str = "Num" + str;
		else if (str.charAt(0).match(/\d/))
		{
			var numbers = {'0': "Zero_", '1': "One_", '2': "Two_", '3': "Three_",
				'4': "Four_", '5': "Five_", '6': "Six_", '7': "Seven_",
				'8': "Eight_", '9': "Nine_"};
			str = numbers[str.charAt(0)] + str.substr(1);
		}
		return toProperCase(str).replace(/[^a-z0-9]/ig, "") || "NAMING_FAILED";
	}

	// Determines the most appropriate Go type
	function goType(val)
	{
		if (val === null)
			return "interface{}";
		
		switch (typeof val)
		{
			case "string":
				if (/\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?(\+\d\d:\d\d|Z)/.test(val))
					return "time.Time";
				else
					return "string";
			case "number":
				if (val % 1 === 0)
				{
					if (val > -2147483648 && val < 2147483647)
						return "int";
					else
						return "int64";
				}
				else
					return "float64";
			case "boolean":
				return "bool";
			case "object":
				return "struct";
			case "array":
				return "slice";
			default:
				return "interface{}";
		}
	}

	// Given two types, returns the more specific of the two
	function mostSpecificPossibleGoType(typ1, typ2)
	{
		if (typ1.substr(0, 5) == "float"
				&& typ2.substr(0, 3) == "int")
			return typ1;
		else if (typ1.substr(0, 3) == "int"
				&& typ2.substr(0, 5) == "float")
			return typ1;
		else
			return "interface{}";
	}

	// Proper cases a string according to Go conventions
	function toProperCase(str)
	{
		// https://github.com/golang/lint/blob/39d15d55e9777df34cdffde4f406ab27fd2e60c0/lint.go#L695-L731
		var commonInitialisms = [
			"API", "ASCII", "CPU", "CSS", "DNS", "EOF", "GUID", "HTML", "HTTP", 
			"HTTPS", "ID", "IP", "JSON", "LHS", "QPS", "RAM", "RHS", "RPC", "SLA", 
			"SMTP", "SSH", "TCP", "TLS", "TTL", "UDP", "UI", "UID", "UUID", "URI", 
			"URL", "UTF8", "VM", "XML", "XSRF", "XSS"
		];

		return str.replace(/(^|[^a-zA-Z])([a-z]+)/g, function(unused, sep, frag)
		{
			if (commonInitialisms.indexOf(frag.toUpperCase()) >= 0)
				return sep + frag.toUpperCase();
			else
				return sep + frag[0].toUpperCase() + frag.substr(1).toLowerCase();
		}).replace(/([A-Z])([a-z]+)/g, function(unused, sep, frag)
		{
			if (commonInitialisms.indexOf(sep + frag.toUpperCase()) >= 0)
				return (sep + frag).toUpperCase();
			else
				return sep + frag;
		});
	}
}