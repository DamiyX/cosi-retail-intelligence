#define _GNU_SOURCE 1
#include <jni.h>
#include <dlfcn.h>
#include <errno.h>
#include <fcntl.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
#include <sys/stat.h>
#include <unistd.h>

/* API30 libc entry is resolved lazily; the DSO itself targets minSdk24. No syscall fallback. */
typedef int (*rename_no_replace_fn)(int,const char *,int,const char *,unsigned);
static jlong failure(unsigned stage,int number){return (jlong)(((uint64_t)stage<<32)|(uint32_t)number);}
static int leaf(const char *s){
  static const char *roles[]={"reservation","request.json","raw.jpg","preview.png","receipt.json","numerical.json","failure.json","interruption.json","done","invalidated","resolution"};
  size_t n=strlen(s);if(n<38||n>100||s[36]!='.')return 0;
  for(size_t i=0;i<36;i++){
    if(i==8||i==13||i==18||i==23){if(s[i]!='-')return 0;}
    else if(!((s[i]>='0'&&s[i]<='9')||(s[i]>='a'&&s[i]<='f')))return 0;
  }
  for(size_t i=0;i<sizeof(roles)/sizeof(roles[0]);i++)if(strcmp(s+37,roles[i])==0)return 1;
  return 0;
}
static int matrix_leaf(const char *directory,const char *name){
  const char *base=strrchr(directory,'/');
  if(base==NULL||strcmp(base+1,"camera-matrix-20261023-c1-r2-v1")!=0)return 0;
  static const char *names[]={"D01-DENIED.permission","D02-GRANTED-RESTORED.permission","D03-RESTORED-AFTER-L04.permission","L01-USER-CANCEL.intent","L01-USER-CANCEL.invoke","L01-USER-CANCEL.phase","L01-USER-CANCEL.terminal","L02-BACKGROUND.intent","L02-BACKGROUND.invoke","L02-BACKGROUND.phase","L02-BACKGROUND.terminal","L03-VIEW-UNMOUNT.intent","L03-VIEW-UNMOUNT.invoke","L03-VIEW-UNMOUNT.phase","L03-VIEW-UNMOUNT.terminal","L04-PERMISSION-LOSS.intent","L04-PERMISSION-LOSS.invoke","L04-PERMISSION-LOSS.phase","L04-PERMISSION-LOSS.terminal","M00-A000.intent","M00-A000.terminal","M01-A090.intent","M01-A090.terminal","M02-A180.intent","M02-A180.terminal","M03-A270.intent","M03-A270.terminal","M04-B000.intent","M04-B000.terminal","M05-B090.intent","M05-B090.terminal","M06-B180.intent","M06-B180.terminal","M07-B270.intent","M07-B270.terminal","export-attempt","export-terminal","owner","registry","seal"};
  for(size_t i=0;i<sizeof(names)/sizeof(names[0]);i++)if(strcmp(name,names[i])==0)return 1;
  return 0;
}
static int orientation_leaf(const char *directory,const char *name){
  const char *base=strrchr(directory,'/');if(base==NULL||strcmp(base+1,"camera-orientation-m00-repeat-20261029-c1")!=0)return 0;
  static const char *names[]={"owner","registry","seal","M00-A000.intent","M00-A000.terminal"};
  for(size_t i=0;i<sizeof(names)/sizeof(names[0]);i++){if(strcmp(name,names[i])==0)return 1;}
  return 0;
}
static int recovery_root(const char *directory){
  const char *base=strrchr(directory,'/');return base!=NULL&&(strcmp(base+1,"camera-matrix-recovery-20261024-v1")==0||strcmp(base+1,"camera-matrix-recovery-fixture-20261024-v1")==0||strcmp(base+1,"camera-m00-repeat-export-first-20261029-c1")==0||strcmp(base+1,"camera-m00-repeat-export-fixture-20261029-c1")==0);
}
static int recovery_leaf(const char *directory,const char *name){
  static const char *names[]={"owner","selection","destination","write","verified","terminal"};
  for(size_t i=0;i<sizeof(names)/sizeof(names[0]);i++)if(strcmp(name,names[i])==0)return 1;
  const char *base=strrchr(directory,'/');
  return base!=NULL&&strcmp(base+1,"camera-matrix-recovery-fixture-20261024-v1")==0&&(strcmp(name,"recreate-intent")==0||strcmp(name,"recreate-receipt")==0);
}
/* Current camera store has one exact job; historical orientation stores are read-only. */
static int proof_leaf(const char *directory,const char *name){
  const char *base=strrchr(directory,'/');if(base==NULL)return 0;
  if(strcmp(base+1,"camera-proof-m00-repeat-20261029-c1")==0)
    return strncmp(name,"ec09f0ae-7fa8-3040-b50b-adacd921134d",36)==0&&leaf(name);
  return strcmp(base+1,"camera-proof-v1")==0&&leaf(name);
}
/* Integrated I00/I01 have fixed names only; legacy grammar and publication guarantees unchanged. */
static int integration_leaf(const char *directory,const char *name){
  const char *base=strrchr(directory,'/');if(base==NULL||(strcmp(base+1,"camera-component-integration-v1")!=0&&strcmp(base+1,"camera-component-integration-i01-v1")!=0&&strcmp(base+1,"camera-component-integration-i02-v1")!=0&&strcmp(base+1,"camera-component-integration-i03-v1")!=0&&strcmp(base+1,"camera-component-integration-i04-v1")!=0&&strcmp(base+1,"camera-component-integration-i05-v1")!=0&&strcmp(base+1,"camera-component-integration-i06-v1")!=0&&strcmp(base+1,"camera-component-integration-i07-v1")!=0&&strcmp(base+1,"camera-component-integration-i08-v1")!=0&&strcmp(base+1,"camera-component-integration-i09-v1")!=0&&strcmp(base+1,"camera-component-integration-ic01-v1")!=0))return 0;
  static const char *names[]={"intent","original.jpeg","crop.png","geometry","receipt","export-attempt","export-result","failure","cpu-intent","tensor.f32le","cpu-result","cpu-receipt"};
  for(size_t i=0;i<sizeof(names)/sizeof(names[0]);i++)if(strcmp(name,names[i])==0)return 1;
  return 0;
}
/* New enrollment grammar only. Existing proof predicates and syscall guarantees stay identical. */
static int enrollment_number(const char *text,int maximum){
  int value=0;for(int i=0;i<4;i++){if(text[i]<'0'||text[i]>'9')return 0;value=value*10+(text[i]-'0');}
  return value>=1&&value<=maximum;
}
static int enrollment_leaf(const char *directory,const char *name){
  const char *base=strrchr(directory,'/');if(base==NULL)return 0;base++;
  if(strcmp(base,"observed-enrollment-ledger-v1")==0)
    return strlen(name)==10&&strncmp(name,"event-",6)==0&&enrollment_number(name+6,4096);
  const char *prefix="observed-enrollment-record-";size_t n=strlen(prefix);
  if(strlen(base)!=n+7||strncmp(base,prefix,n)!=0||strcmp(base+n+4,"-v1")!=0||!enrollment_number(base+n,64))return 0;
  static const char *names[]={"intent","original.jpeg","crop.png","geometry","receipt","failure","feature.bin","feature-receipt"};
  for(size_t i=0;i<sizeof(names)/sizeof(names[0]);i++)if(strcmp(name,names[i])==0)return 1;
  return 0;
}
/* Fixed descriptor/report publication only; stages remain exactly final + .new. */
static int enrollment_control_leaf(const char *directory,const char *name){
  const char *base=strrchr(directory,'/');
  if(base==NULL||strcmp(base+1,"observed-enrollment-evidence-v1")!=0)return 0;
  if(strstr(directory,"//")!=NULL)return 0;
  for(const char *part=directory;*part;part++){if((part==directory||part[-1]=='/')&&(part[0]=='.')&&(part[1]=='/'||part[1]=='\0'||(part[1]=='.'&&(part[2]=='/'||part[2]=='\0'))))return 0;}

  if(strcmp(name,"session")==0)return 1;
  if(strcmp(name,"R04.read-diagnostic-intent")==0||strcmp(name,"R04.read-diagnostic-result")==0)return 1;
  if(strlen(name)<7||name[0]!='R'||name[1]!='0'||name[2]<'1'||name[2]>'8'||name[3]!='.')return 0;
  static const char *suffixes[]={"bin","intent","result","export-intent","destination","export-result"};
  for(size_t i=0;i<sizeof(suffixes)/sizeof(suffixes[0]);i++)if(strcmp(name+4,suffixes[i])==0)return 1;
  return 0;
}
/* New diagnostic leaves retain their own byte bounds even at the JNI boundary. */
static int diagnostic_size(const char *directory,const char *name,jlong bytes){
  if(!enrollment_control_leaf(directory,name))return 1;
  if(strcmp(name,"R04.read-diagnostic-intent")==0)return bytes>0&&bytes<=2048;
  if(strcmp(name,"R04.read-diagnostic-result")==0)return bytes>0&&bytes<=4096;
  if(name[0]=='R'&&name[1]=='0'&&name[2]>='6'&&name[2]<='8'&&name[3]=='.')return bytes>0&&bytes<=(strcmp(name+4,"bin")==0?4194304:65536);
  return 1;
}
static int regular(const struct stat *s){return S_ISREG(s->st_mode)&&s->st_nlink==1&&s->st_uid==getuid();}
static int original(const struct stat *s,const jlong *e){
  return regular(s)&&(jlong)s->st_dev==e[2]&&(jlong)s->st_ino==e[3]&&(jlong)s->st_size==e[4]
    &&(jlong)s->st_mtim.tv_sec==e[5]&&(jlong)s->st_mtim.tv_nsec==e[6]
    &&(jlong)s->st_ctim.tv_sec==e[7]&&(jlong)s->st_ctim.tv_nsec==e[8];
}
static int published(const struct stat *s,const jlong *e){
  /* rename may change ctime. Identity, length, nanosecond mtime and single link must survive. */
  return regular(s)&&(jlong)s->st_dev==e[2]&&(jlong)s->st_ino==e[3]&&(jlong)s->st_size==e[4]
    &&(jlong)s->st_mtim.tv_sec==e[5]&&(jlong)s->st_mtim.tv_nsec==e[6];
}
static jlong publish_at(const char *directory,const char *from,const char *to,const jlong *e){
  if((recovery_root(directory)?!recovery_leaf(directory,to):(!proof_leaf(directory,to)&&!matrix_leaf(directory,to)&&!orientation_leaf(directory,to)&&!integration_leaf(directory,to)&&!enrollment_leaf(directory,to)&&!enrollment_control_leaf(directory,to)))||strlen(from)!=strlen(to)+4||strncmp(from,to,strlen(to))!=0||strcmp(from+strlen(to),".new")!=0)return failure(3,EINVAL);
  if(!diagnostic_size(directory,to,e[4]))return failure(3,EINVAL);
  rename_no_replace_fn rename_exclusive=(rename_no_replace_fn)dlsym(RTLD_DEFAULT,"renameat2");
  if(rename_exclusive==NULL)return failure(5,ENOSYS);
  int dir=open(directory,O_RDONLY|O_DIRECTORY|O_NOFOLLOW|O_CLOEXEC);if(dir<0)return failure(1,errno);
  int source=-1;jlong result=0;struct stat st;
  if(fstat(dir,&st)<0){result=failure(2,errno);goto close_all;}
  if(!S_ISDIR(st.st_mode)||st.st_uid!=getuid()||(jlong)st.st_dev!=e[0]||(jlong)st.st_ino!=e[1]){result=failure(2,ESTALE);goto close_all;}
  source=openat(dir,from,O_RDONLY|O_NOFOLLOW|O_CLOEXEC);if(source<0){result=failure(3,errno);goto close_all;}
  if(fstat(source,&st)<0){result=failure(3,errno);goto close_all;}
  if(!original(&st,e)){result=failure(3,ESTALE);goto close_all;}
  if(fsync(source)<0){result=failure(4,errno);goto close_all;}
  if(fstatat(dir,from,&st,AT_SYMLINK_NOFOLLOW)<0){result=failure(3,errno);goto close_all;}
  if(!original(&st,e)){result=failure(3,ESTALE);goto close_all;}
  /* The kernel, not an exists-check race, enforces exclusive destination publication. */
  if(rename_exclusive(dir,from,dir,to,RENAME_NOREPLACE)<0){result=failure(5,errno);goto close_all;}
  if(fstatat(dir,to,&st,AT_SYMLINK_NOFOLLOW)<0){result=failure(7,errno);goto close_all;}
  if(!published(&st,e)){result=failure(7,ESTALE);goto close_all;}
  if(fstat(source,&st)<0){result=failure(7,errno);goto close_all;}
  if(!published(&st,e)){result=failure(7,ESTALE);goto close_all;}
  if(fstatat(dir,from,&st,AT_SYMLINK_NOFOLLOW)==0){result=failure(7,ESTALE);goto close_all;}
  if(errno!=ENOENT){result=failure(7,errno);goto close_all;}
  if(fsync(dir)<0){result=failure(6,errno);goto close_all;}
  if(lstat(directory,&st)<0){result=failure(2,errno);goto close_all;}
  if(!S_ISDIR(st.st_mode)||st.st_uid!=getuid()||(jlong)st.st_dev!=e[0]||(jlong)st.st_ino!=e[1])result=failure(2,ESTALE);
close_all:
  /* Never hide the primary error behind close; do not retry close after EINTR. */
  if(source>=0&&close(source)<0&&result==0)result=failure(9,errno);
  if(close(dir)<0&&result==0)result=failure(8,errno);
  return result;
}
JNIEXPORT jlong JNICALL Java_expo_modules_recognitioncpu_CameraProofRename_publishNative(
  JNIEnv *env,jclass type,jstring directory,jstring from,jstring to,jlongArray identity){
  (void)type;
  if(directory==NULL||from==NULL||to==NULL||identity==NULL||(*env)->GetArrayLength(env,identity)!=9)return failure(3,EINVAL);
  jlong e[9];(*env)->GetLongArrayRegion(env,identity,0,9,e);if((*env)->ExceptionCheck(env))return failure(3,EINVAL);
  const char *d=(*env)->GetStringUTFChars(env,directory,NULL);if(d==NULL)return failure(3,ENOMEM);
  const char *a=(*env)->GetStringUTFChars(env,from,NULL);if(a==NULL){(*env)->ReleaseStringUTFChars(env,directory,d);return failure(3,ENOMEM);}
  const char *b=(*env)->GetStringUTFChars(env,to,NULL);jlong result=failure(3,ENOMEM);
  if(b!=NULL){result=publish_at(d,a,b,e);(*env)->ReleaseStringUTFChars(env,to,b);}
  (*env)->ReleaseStringUTFChars(env,from,a);(*env)->ReleaseStringUTFChars(env,directory,d);return result;
}
