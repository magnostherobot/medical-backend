.PHONY: default clean FORCE

default : main.pdf

%.pdf : %.tex FORCE
	latexmk -pdf $<

clean :
	latexmk -C
