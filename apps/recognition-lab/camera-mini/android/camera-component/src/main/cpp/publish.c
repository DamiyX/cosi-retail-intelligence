/* Independently implemented narrow adapter for Linux renameat2(RENAME_NOREPLACE).
 * Same publication mechanism as repository CameraProofRename; no legacy globals. */
#define _GNU_SOURCE
#include <jni.h>
#include <fcntl.h>
#include <unistd.h>
#include <sys/stat.h>
#include <dlfcn.h>
#include <errno.h>
#include <string.h>
JNIEXPORT jint JNICALL Java_local_cameracomponent_AndroidDisk_publishNative(JNIEnv *e,jclass c,jstring path,jstring src,jstring dst,jlong device,jlong inode,jint uid) {
 (void)c; const char *p=(*e)->GetStringUTFChars(e,path,0),*s=(*e)->GetStringUTFChars(e,src,0),*t=(*e)->GetStringUTFChars(e,dst,0);
 int result=EINVAL,fd=-1; struct stat st;
 if(!p||!s||!t)goto done;
 if(strchr(s,'/')||strchr(t,'/')||!strcmp(s,".")||!strcmp(t,".")||!strcmp(s,"..")||!strcmp(t,".."))goto done;
 fd=open(p,O_RDONLY|O_DIRECTORY|O_NOFOLLOW|O_CLOEXEC);if(fd<0){result=errno;goto done;}
 if(fstat(fd,&st)||st.st_dev!=(dev_t)device||st.st_ino!=(ino_t)inode||st.st_uid!=(uid_t)uid){result=EPERM;goto done;}
 int (*rename_ex)(int,const char*,int,const char*,unsigned int)=dlsym(RTLD_DEFAULT,"renameat2");if(!rename_ex){result=ENOSYS;goto done;}
 if(rename_ex(fd,s,fd,t,1)){result=errno;goto done;}
 result=fsync(fd)?errno:0;
 done:if(fd>=0)close(fd);if(p)(*e)->ReleaseStringUTFChars(e,path,p);if(s)(*e)->ReleaseStringUTFChars(e,src,s);if(t)(*e)->ReleaseStringUTFChars(e,dst,t);return result;
}
