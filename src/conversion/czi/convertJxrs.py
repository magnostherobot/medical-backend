from concurrent.futures import ThreadPoolExecutor
from subprocess import check_call
from glob import glob
from sys import argv

totalFiles = 0
coutner = 0


def convertjxrs(filename):
	global counter
	global totalFiles
	try:
		asTif = filename.rsplit('.',1)[0] + ".tif"
		check_call(['JxrDecApp', "-i", filename, "-o", asTif])
		check_call(['convert', asTif, filename.rsplit('.',1)[0] + ".png"])
		check_call(['rm', filename, asTif])
		counter += 1
	except Exception as help:
		print ("Processing Failed. Probably couldn't find decoder due to invalid system environment path, check this before debugging.");
		print ("Actual error was:");
		print (help);
		exit(0);

	print (f"> Processed File: {counter}/{totalFiles}   :   {filename}  -->  {filename.rsplit('.',1)[0]}.png")


if __name__ == "__main__":

	if (len(argv) != 2):
		print("\nMissing Argument!\n\nUsage:\npython3 convertJxrs.py <DirectoryContainingJxrs>")
		exit(0)
	else:
		print("=========== BEGIN JXR CONVERSION ===========")
		print ('Files Dir: ' + argv[1] + '\n')

		filenames = glob(argv[1] + 'data-*.jxr')
		counter = 0
		totalFiles = len(filenames)

		pool = ThreadPoolExecutor(5)
		for f in pool.map(convertjxrs, filenames):
			pass
			pool.shutdown(True)
		print("=========== FINISH JXR CONVERSION ===========")
