.PHONY: default clean

default : main.pdf

%.pdf : %.tex
	latexmk -pdf $<

clean :
	latexmk -C
