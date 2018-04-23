import requests

token = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJvYmplY3QiOnsidXNlcm5hbWUiOiJoYWZlZXoiLCJwYXNzd29yZEludGVybmFsIjpudWxsLCJjcmVhdGlvbkRhdGUiOiIyMDE4LTA0LTIzVDA2OjA1OjQwLjYwNloiLCJ1cGRhdGVkQXQiOiIyMDE4LTA0LTIzVDA2OjA1OjQwLjYwNloiLCJ1c2VyR3JvdXBzIjpbeyJpZCI6MSwibmFtZSI6ImxvZ2dpbmciLCJjYW5DcmVhdGVVc2VycyI6bnVsbCwiY2FuRGVsZXRlVXNlcnMiOm51bGwsImNhbkVkaXRVc2VycyI6bnVsbCwiY2FuQ3JlYXRlUHJvamVjdHMiOm51bGwsImNhbkRlbGV0ZVByb2plY3RzIjpudWxsLCJjYW5FZGl0UHJvamVjdHMiOm51bGwsImNhbkFjY2Vzc0xvZ3MiOnRydWUsImlzSW50ZXJuYWwiOmZhbHNlLCJkZXNjcmlwdGlvbiI6IkFsbG93cyBQb3N0IHRvIExvZyIsIlVzZXJIYXNQcml2aWxlZ2UiOnsidXNlcm5hbWUiOiJoYWZlZXoiLCJwcml2aWxlZ2VJZCI6MX19LHsiaWQiOjIsIm5hbWUiOiJhZG1pbiIsImNhbkNyZWF0ZVVzZXJzIjp0cnVlLCJjYW5EZWxldGVVc2VycyI6dHJ1ZSwiY2FuRWRpdFVzZXJzIjp0cnVlLCJjYW5DcmVhdGVQcm9qZWN0cyI6dHJ1ZSwiY2FuRGVsZXRlUHJvamVjdHMiOnRydWUsImNhbkVkaXRQcm9qZWN0cyI6dHJ1ZSwiY2FuQWNjZXNzTG9ncyI6bnVsbCwiaXNJbnRlcm5hbCI6ZmFsc2UsImRlc2NyaXB0aW9uIjoiU3lzdGVtcyBhZG1pbiIsIlVzZXJIYXNQcml2aWxlZ2UiOnsidXNlcm5hbWUiOiJoYWZlZXoiLCJwcml2aWxlZ2VJZCI6Mn19XSwicHJvamVjdHMiOltdfSwiaWF0IjoxNTI0NDYzNTY3LCJleHAiOjE1MjQ0ODUxNjd9.uJIsxoUyqECt_4rJFpipcT12E0dmWsQi_381usVg0zY"
chunksize = 1024 * 1024 * 4;


def read_in_chunks(file_object):
	"""Lazy function (generator) to read a file piece by piece.
	Default chunk size: 1k."""
	while True:
		data = file_object.read(chunksize)
		if not data:
			break
		yield data


f = open('/cs/scratch/cjd24/0701.czi')
if __name__ == "__main__":
	iterator = read_in_chunks(f)

	r = requests.post("http://localhost:3000/cs3099group-be-4/projects/fake-project/files/0701.czi", headers={"authorization":token}, data=iterator.next())

	print(r.text)

	offset = chunksize;
	current = iterator.next()
	while(True):
		nchunk = iterator.next()
		if not nchunk:
			r = requests.post("http://localhost:3000/cs3099group-be-4/projects/fake-project/files/0701.czi?overwrite=true&offset=" + str(offset) + "&final=true", headers={"authorization":token}, data=current)
			print(r.text)
			break;

		r = requests.post("http://localhost:3000/cs3099group-be-4/projects/fake-project/files/0701.czi?overwrite=true&offset=" + str(offset), headers={"authorization":token}, data=current)
		print(r.text)
		current = nchunk;
		offset += chunksize
