# change dir to this scripts directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/"
cd $SCRIPT_DIR

# check if ctm folder exists, if so ask to delete
DIRECTORY=ctm/
if [ -d "$DIRECTORY" ]; then
  echo "ctm directory already exists, please delete first"
  exit
fi

# make output directory
mkdir ctm

# loop over obj files and convert to ctm
EXT=obj
for i in obj/*; do
    if [ "${i}" != "${i%.${EXT}}" ];then
        echo "I do something with the file $i"
        filename=$(basename "$i")
        filename="${filename%.*}"
        echo $filename
        ctmconv obj/$filename.obj ctm/$filename.ctm
    fi
done
