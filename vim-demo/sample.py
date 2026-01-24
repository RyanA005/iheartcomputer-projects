# sample-file.py


# this sample python file probably does not do anything, it is simply my canvas to flex my Vim skills...
# begin with mode explaination, then use of home row + ewb for navigation, then show some cool commands in action
# keep this demo to ~5 minutes, actually teach and then show off, just so people see how this is an improvement


# basic navigation

h = "left"
j = "down"
k = "up"
l = "right"

e = "jump to end of next word"
w = "jump to the beginning of next word"
b = "jump to beginning of last word"

# all of these can be modulated with a number...

G = "jump to bottom of file"
gg = "jump to top of file"

i = "insert to left"
a = "insert to right"
o = "insert on newline below"

escape = "back to normal mode"

# other motions

y = "yank(copy)"
d = "delete(+copy to default register(cut))"
p = "paste(from default register)"
c = "change, combo with w, e, iw, i)"
u = "undo"
ctrlR = "redo"
f = "find next occurence"

# these go on for years... a few more usefull ones:

# :s/new/old/g
# /pattern  -  uses regular expressions, n for next
# $ end of line
# 0 or ^ beginning of line
# {} start or end of paragraph
# q + register(a) to start recoring a macro and q again to end, then @register to repeat, @@ for last 10@a for 10x

# sample code to edit

print("welcome to our sample python program")

# TODO print my name

# TODO find out what is 45678 * 9999

# TODO format this list into [ "Country" = "", "Capital" = "", "Pos" = [ "Lat" = "", "Lon" = "" ] ] 

# Country  	Capital  	Latitude  Longitude     Population      Capital-Type
my_list = [
Afghanistan	Kabul		34.5289	69.1725		4011770		Capital
Albania		Tirana		41.3275	19.8189		475577		Capital
Algeria		Algiers		36.7525	3.04200		2693542		Capital
Angola		Luanda		-8.8368	13.2343		7774200		Capital
Anguilla	The Valley	18.2170	-63.057		1402		Capital
Argentina	Buenos Aires	-34.605	-58.400		14966530	Capital
Aruba		Oranjestad	12.5240	-70.027		29877		Capital
Australia	Canberra	-35.283	149.128		447692		Capital
Austria		Vienna		48.2064	16.3707		1900547		Capital
]

# format a single line and save as a macro
# repeat repeat repeat repeat......

# macro is roughly: I[ "Country" = ", <esc>diWea"<esc>diWi"Capital" = "<esc>f<tab>i", "Pos" = [ <esc>diWf<tab>i, <esc>diWf<tab>i] ], Di <bspace><enter>0









my_list = [
	[ "Country" = "Afghanistan", "Capital" = "Kabul", "Pos" = [ 34.5289, 69.1725 ] ],  
	[ "Country" = "Albania", "Capital" = "Tirana", "Pos" = [ 41.3275, 19.8189 ] ],  
	[ "Country" = "Algeria", "Capital" = "Algiers", "Pos" = [ 36.7525, 3.04200 ] ],  
	[ "Country" = "Angola", "Capital" = "Luanda", "Pos" = [ -8.8368, 13.2343 ] ],  
	[ "Country" = "Anguilla", "Capital" = "The Valley", "Pos" = [ 18.2170, -63.057 ] ],  
	[ "Country" = "Argentina", "Capital" = "Buenos Aires", "Pos" = [ -34.605, -58.400 ] ],  
	[ "Country" = "Aruba", "Capital" = "Oranjestad", "Pos" = [ 12.5240, -70.027 ] ],  
	[ "Country" = "Australia", "Capital" = "Canberra", "Pos" = [ -35.283, 149.128 ] ],  
	[ "Country" = "Austria", "Capital" = "Vienna", "Pos" = [ 48.2064, 16.3707 ] ],  
]
















my_list = [
	[ "Country" = "Afghanistan", "Capital" = "Kabul", "Pos" = [ 34.5289, 69.1725 ] ], 
	[ "Country" = "Albania", "Capital" = "Tirana", "Pos" = [ 41.3275, 19.8189 ] ], 
	[ "Country" = "Algeria", "Capital" = "Algiers", "Pos" = [ 36.7525, 3.04200 ] ], 
	[ "Country" = "Angola", "Capital" = "Luanda", "Pos" = [ -8.8368, 13.2343 ] ], 
	[ "Country" = "Anguilla", "Capital" = "The Valley", "Pos" = [ 18.2170, -63.057 ] ], 
	[ "Country" = "Argentina", "Capital" = "Buenos Aires", "Pos" = [ -34.605, -58.400 ] ], 
	[ "Country" = "Aruba", "Capital" = "Oranjestad", "Pos" = [ 12.5240, -70.027 ] ], 
	[ "Country" = "Australia", "Capital" = "Canberra", "Pos" = [ -35.283, 149.128 ] ], 
	[ "Country" = "Austria", "Capital" = "Vienna", "Pos" = [ 48.2064, 16.3707 ] ], 
]













